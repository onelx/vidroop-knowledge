import { json, jsonError } from "@/lib/api/utils";
import { requireApiKey } from "@/lib/auth/api-key";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request, ctx: RouteContext<"/api/v1/paginas/[id]">) {
  const auth = await requireApiKey(request, ["read:paginas"]);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const supa = supabaseAdmin();

  const { data, error } = await supa
    .from("paginas")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return jsonError(500, "db_error", error.message);
  if (!data) return jsonError(404, "not_found", "Página no encontrada");

  const baseUrl = new URL(request.url);
  baseUrl.pathname = `/api/v1/paginas/${id}`;
  baseUrl.search = "";

  return json({
    data: {
      ...data,
      links: {
        html: data.html_path ? `${baseUrl}/html` : null,
        screenshot: data.screenshot_path ? `${baseUrl}/screenshot` : null,
        dom_tree: data.dom_tree_path ? `${baseUrl}/dom-tree` : null,
        text: data.text_content ? `${baseUrl}/text` : null,
      },
    },
  });
}
