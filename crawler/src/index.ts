/**
 * Vidroop Knowledge Crawler — corre en GitHub Actions.
 *
 * Inputs (env vars):
 *   CRAWL_ID                — UUID del crawl ya creado en BD
 *   ACADEMIA_ID             — UUID de la academia
 *   SUPABASE_URL            — URL del proyecto Supabase
 *   SUPABASE_SERVICE_ROLE_KEY — para escribir BD y Storage
 *   CREDENTIAL_ENCRYPTION_KEY — para descifrar credenciales
 *
 * Flujo:
 *   1. Lee la academia + credenciales
 *   2. Lanza Playwright
 *   3. Login en Vidroop
 *   4. Extrae rutas del Vue router (más allá de las hardcodeadas)
 *   5. Para cada ruta estática: navega, captura HTML/screenshot/DOM, sube a Storage, inserta row en `paginas`
 *   6. Actualiza catálogo de `rutas`
 *   7. Marca crawl como completed (o failed/partial)
 */

import crypto from "node:crypto";
import { chromium, type Browser, type Page } from "playwright";
import { supabaseAdmin } from "./supabase.js";
import { decryptCredential } from "./crypto.js";
import { STATIC_ROUTES } from "./routes.js";

type RouteInfo = { path: string; name: string; isDynamic: boolean };

const CRAWL_ID = mustEnv("CRAWL_ID");
const ACADEMIA_ID = mustEnv("ACADEMIA_ID");
const PAGE_TIMEOUT_MS = 30000;
const POST_NAV_WAIT_MS = 2000; // dejar que Vue cargue datos

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta env var: ${name}`);
  return v;
}

function slugifyPath(path: string): string {
  return path
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^a-z0-9-]/gi, "-")
    .replace(/-+/g, "-")
    .toLowerCase() || "root";
}

/**
 * Hash del contenido visible normalizado de una página. Es la base de la
 * detección de cambios: si el hash coincide con el de la última captura de la
 * misma ruta, la página no cambió y no se re-suben artefactos.
 * Se normaliza el whitespace para evitar diffs espurios por re-render de Vue.
 */
function hashContent(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  return crypto.createHash("sha256").update(normalized, "utf8").digest("hex");
}

async function main(): Promise<void> {
  const supa = supabaseAdmin();
  console.log(`[crawler] start crawl_id=${CRAWL_ID} academia_id=${ACADEMIA_ID}`);

  const ghRunId = process.env.GITHUB_RUN_ID ? Number(process.env.GITHUB_RUN_ID) : null;

  // Si el crawl fue cancelado mientras estaba pending, no arrancar.
  const { data: cur } = await supa.from("crawls").select("status").eq("id", CRAWL_ID).maybeSingle();
  if (cur?.status === "cancelled") {
    console.log("[crawler] crawl ya cancelado antes de arrancar, salgo");
    return;
  }

  // Marcar el crawl como running + guardar el run_id de GitHub Actions (para poder cancelarlo).
  await supa.from("crawls").update({ status: "running", gh_run_id: ghRunId }).eq("id", CRAWL_ID);

  const startedAt = Date.now();
  let pagesSuccess = 0;
  let pagesFailed = 0;
  let pagesChanged = 0;
  let pagesUnchanged = 0;
  let cancelled = false;

  let browser: Browser | null = null;
  try {
    // 1. Leer academia
    const { data: academia, error: aerr } = await supa
      .from("academias")
      .select("id, slug, base_url, api_base_url")
      .eq("id", ACADEMIA_ID)
      .single();
    if (aerr || !academia) throw new Error(`Academia no encontrada: ${aerr?.message}`);

    // 2. Leer credenciales (primera activa)
    const { data: cred, error: cerr } = await supa
      .from("credenciales")
      .select("email, password_encrypted")
      .eq("academia_id", ACADEMIA_ID)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (cerr || !cred) throw new Error(`Sin credenciales para academia ${ACADEMIA_ID}`);

    // Supabase devuelve bytea como hex string \\x...
    let encryptedBuf: Buffer;
    if (typeof cred.password_encrypted === "string") {
      const hex = cred.password_encrypted.replace(/^\\x/, "");
      encryptedBuf = Buffer.from(hex, "hex");
    } else {
      encryptedBuf = Buffer.from(cred.password_encrypted as unknown as Uint8Array);
    }
    const password = decryptCredential(encryptedBuf);

    // 3. Launch browser
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 VidroopKnowledgeBot/0.1",
    });
    const page = await context.newPage();

    // 4. Login
    console.log(`[crawler] login as ${cred.email}`);
    await loginVidroop(page, academia.base_url, cred.email, password);

    // 5. Extraer rutas del Vue router
    const dynamicRoutes = await extractVueRouter(page);
    console.log(`[crawler] router devolvió ${dynamicRoutes.length} rutas`);

    // 6. Upsert rutas en catálogo
    if (dynamicRoutes.length > 0) {
      await supa.from("rutas").upsert(
        dynamicRoutes.map((r) => ({
          academia_id: ACADEMIA_ID,
          path_pattern: r.path,
          route_name: r.name || "unknown",
          is_dynamic: r.isDynamic,
          last_seen_at: new Date().toISOString(),
          last_seen_crawl_id: CRAWL_ID,
        })),
        { onConflict: "academia_id,path_pattern" },
      );
    }

    // 7. Armar la lista de destinos a recorrer:
    //    - rutas estáticas del back-office (academia.vidroop.com), con login
    //    - storefront público (tienda.vidroop.com/academia/{slug}), sin login,
    //      es la vista del comprador/alumno (otro dominio, otra app)
    const storefrontBase = `https://tienda.vidroop.com/academia/${academia.slug}`;
    const targets: { path: string; name: string; url: string }[] = [
      ...STATIC_ROUTES.map((r) => ({
        path: r.path,
        name: r.name,
        url: `${academia.base_url}${r.path}`,
      })),
      { path: "/tienda", name: "storefront-home", url: storefrontBase },
    ];

    for (const route of targets) {
      // Cancelación cooperativa: si el panel marcó el crawl como cancelled, abortar.
      const { data: chk } = await supa.from("crawls").select("status").eq("id", CRAWL_ID).maybeSingle();
      if (chk?.status === "cancelled") {
        cancelled = true;
        console.log("[crawler] ⏹ cancelado manualmente, abortando recorrido");
        break;
      }
      try {
        const { changed } = await capturePage(supa, page, ACADEMIA_ID, route);
        pagesSuccess++;
        if (changed) pagesChanged++;
        else pagesUnchanged++;
        console.log(`[crawler] ${changed ? "✚ CAMBIÓ" : "= igual "} ${route.path}`);
      } catch (e) {
        pagesFailed++;
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[crawler] ✗ ${route.path} — ${msg}`);
        await supa.from("paginas").insert({
          crawl_id: CRAWL_ID,
          path: route.path,
          full_url: route.url,
          route_name: route.name,
          http_status: 0,
          error_message: msg,
          captured_at: new Date().toISOString(),
        });
      }
    }

    // 8. Marcar crawl completed (o cancelled si se detuvo a mano)
    const endedAt = Date.now();
    const status = cancelled
      ? "cancelled"
      : pagesFailed === 0
        ? "completed"
        : pagesFailed < targets.length
          ? "partial"
          : "failed";
    await supa
      .from("crawls")
      .update({
        status,
        ended_at: new Date().toISOString(),
        duration_ms: endedAt - startedAt,
        pages_total: targets.length,
        pages_success: pagesSuccess,
        pages_failed: pagesFailed,
        pages_changed: pagesChanged,
        pages_unchanged: pagesUnchanged,
      })
      .eq("id", CRAWL_ID);

    console.log(
      `[crawler] done status=${status} success=${pagesSuccess} failed=${pagesFailed} changed=${pagesChanged} unchanged=${pagesUnchanged}`,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    console.error(`[crawler] fatal: ${msg}`);
    await supa
      .from("crawls")
      .update({
        status: "failed",
        ended_at: new Date().toISOString(),
        duration_ms: Date.now() - startedAt,
        pages_success: pagesSuccess,
        pages_failed: pagesFailed,
        error_message: msg,
        error_stack: stack,
      })
      .eq("id", CRAWL_ID);
    process.exitCode = 1;
  } finally {
    await browser?.close().catch(() => {});
  }
}

async function loginVidroop(page: Page, baseUrl: string, email: string, password: string): Promise<void> {
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle", timeout: PAGE_TIMEOUT_MS });

  // Vidroop usa Vue + inputs custom. Llenamos por placeholder.
  await page.locator('input[placeholder="Usuario"]').fill(email);
  await page.locator('input[placeholder="Contraseña"]').fill(password);

  // Submit
  await Promise.all([
    page.waitForURL((url) => !url.toString().includes("/login"), { timeout: PAGE_TIMEOUT_MS }),
    page.locator('button[type="submit"]').click(),
  ]);

  await page.waitForTimeout(POST_NAV_WAIT_MS);
}

async function extractVueRouter(page: Page): Promise<RouteInfo[]> {
  return await page.evaluate(() => {
    type RawRoute = { path: string; name?: string; children?: RawRoute[] };
    function getApp() {
      const el = document.querySelector("#app") as (Element & { __vue_app__?: unknown; __vue__?: unknown }) | null;
      if (!el) return null;
      return el.__vue_app__ ?? el.__vue__ ?? null;
    }
    const app = getApp() as { config?: { globalProperties?: { $router?: unknown } }; $router?: unknown } | null;
    if (!app) return [];
    const router = (app.config?.globalProperties?.$router ?? app.$router) as { options?: { routes?: RawRoute[] }; getRoutes?: () => RawRoute[] } | undefined;
    if (!router) return [];
    const routes = router.options?.routes ?? router.getRoutes?.() ?? [];
    function collect(rs: RawRoute[], prefix = ""): RouteInfo[] {
      const out: RouteInfo[] = [];
      for (const r of rs) {
        const p = (prefix + "/" + (r.path ?? "")).replace(/\/+/g, "/");
        out.push({ path: p, name: r.name ?? "", isDynamic: /:/.test(p) || p.includes("*") });
        if (r.children) out.push(...collect(r.children, p));
      }
      return out;
    }
    type RouteInfo = { path: string; name: string; isDynamic: boolean };
    return collect(routes);
  });
}

async function capturePage(
  supa: ReturnType<typeof supabaseAdmin>,
  page: Page,
  academiaId: string,
  route: { path: string; name: string; url: string },
): Promise<{ changed: boolean }> {
  const t0 = Date.now();
  const url = route.url;

  const response = await page.goto(url, { waitUntil: "networkidle", timeout: PAGE_TIMEOUT_MS });
  await page.waitForTimeout(POST_NAV_WAIT_MS);

  const httpStatus = response?.status() ?? 0;
  const fullUrl = page.url();
  const title = await page.title();
  const text = await page.evaluate(() => document.body?.innerText ?? "");
  // Snapshot custom del DOM: títulos, links, inputs, buttons — más útil que HTML crudo
  const domSnapshot = await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6")).map((el) => ({
      tag: el.tagName.toLowerCase(),
      text: (el.textContent ?? "").trim().slice(0, 200),
    }));
    const links = Array.from(document.querySelectorAll("a[href]")).map((el) => ({
      text: (el.textContent ?? "").trim().slice(0, 100),
      href: (el as HTMLAnchorElement).getAttribute("href") ?? "",
    }));
    const inputs = Array.from(document.querySelectorAll("input, textarea, select")).map((el) => ({
      tag: el.tagName.toLowerCase(),
      type: (el as HTMLInputElement).type ?? null,
      name: (el as HTMLInputElement).name ?? null,
      placeholder: (el as HTMLInputElement).placeholder ?? null,
    }));
    const buttons = Array.from(document.querySelectorAll("button")).map((el) => ({
      text: (el.textContent ?? "").trim().slice(0, 80),
      type: (el as HTMLButtonElement).type ?? null,
    }));
    return { headings, links, inputs, buttons };
  });
  const domJson = JSON.stringify(domSnapshot, null, 2);

  const linksCount = await page.locator("a").count();
  const formsCount = await page.locator("form").count();

  // Hash del contenido visible para detectar cambios.
  const contentHash = hashContent(text);

  // Buscar la última captura CON HASH de esta ruta para esta academia.
  const { data: prev } = await supa
    .from("paginas")
    .select("content_hash, html_path, screenshot_path, dom_tree_path, crawls!inner(academia_id)")
    .eq("path", route.path)
    .eq("crawls.academia_id", academiaId)
    .not("content_hash", "is", null)
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const unchanged = !!prev && prev.content_hash === contentHash;

  if (unchanged) {
    // Sin cambios: fila liviana reusando los artefactos de la captura previa.
    // NO se toma screenshot ni se sube nada a Storage (lo costoso del crawl).
    await supa.from("paginas").insert({
      crawl_id: CRAWL_ID,
      path: route.path,
      full_url: fullUrl,
      route_name: route.name,
      title,
      http_status: httpStatus,
      html_path: prev!.html_path,
      screenshot_path: prev!.screenshot_path,
      dom_tree_path: prev!.dom_tree_path,
      text_content: text.slice(0, 50000),
      content_hash: contentHash,
      changed: false,
      duration_ms: Date.now() - t0,
      links_count: linksCount,
      forms_count: formsCount,
    });
    return { changed: false };
  }

  // Cambió (o es la primera vez): capturar HTML + screenshot y subir artefactos.
  const html = await page.content();
  const screenshotBuf = await page.screenshot({ fullPage: true, type: "png" });

  const slug = slugifyPath(route.path);
  const htmlPath = `${CRAWL_ID}/${slug}.html`;
  const pngPath = `${CRAWL_ID}/${slug}.png`;
  const domPath = `${CRAWL_ID}/${slug}.dom.json`;

  await supa.storage.from("crawl-artifacts").upload(htmlPath, Buffer.from(html, "utf8"), {
    contentType: "text/html",
    upsert: true,
  });
  await supa.storage.from("crawl-artifacts").upload(pngPath, screenshotBuf, {
    contentType: "image/png",
    upsert: true,
  });
  await supa.storage.from("crawl-artifacts").upload(domPath, Buffer.from(domJson, "utf8"), {
    contentType: "application/json",
    upsert: true,
  });

  await supa.from("paginas").insert({
    crawl_id: CRAWL_ID,
    path: route.path,
    full_url: fullUrl,
    route_name: route.name,
    title,
    http_status: httpStatus,
    html_path: htmlPath,
    screenshot_path: pngPath,
    dom_tree_path: domPath,
    text_content: text.slice(0, 50000), // cap
    content_hash: contentHash,
    changed: true,
    duration_ms: Date.now() - t0,
    links_count: linksCount,
    forms_count: formsCount,
  });

  return { changed: true };
}

main().catch((e) => {
  console.error(`[crawler] uncaught: ${e}`);
  process.exit(1);
});
