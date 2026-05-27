import { json, jsonError } from "@/lib/api/utils";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supa = supabaseAdmin();
    const { data, error } = await supa
      .from("crawls")
      .select("id, ended_at, status")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return jsonError(500, "db_error", error.message);
    }

    const lastCrawl = data
      ? {
          id: data.id,
          status: data.status,
          ended_at: data.ended_at,
          minutes_ago: data.ended_at
            ? Math.floor((Date.now() - new Date(data.ended_at).getTime()) / 60000)
            : null,
        }
      : null;

    return json({ ok: true, db: "ok", last_crawl: lastCrawl });
  } catch (e) {
    return jsonError(500, "internal", e instanceof Error ? e.message : "unknown");
  }
}
