"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type State = "idle" | "loading" | "ok" | "error";

export default function CrawlButton({ academiaId }: { academiaId: string }) {
  const router = useRouter();
  const [state, setState] = useState<State>("idle");
  const [msg, setMsg] = useState<string>("");

  async function trigger() {
    setState("loading");
    setMsg("");
    try {
      const res = await fetch("/api/admin/crawl", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ academia_id: academiaId }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      if (!res.ok) {
        setState("error");
        setMsg(body?.error?.message ?? `Error ${res.status}`);
        return;
      }
      setState("ok");
      setMsg("Crawl encolado. Corre en GitHub Actions (~1-2 min).");
      // Refrescar la tabla de crawls a los pocos segundos para ver el nuevo row.
      setTimeout(() => router.refresh(), 4000);
    } catch (e) {
      setState("error");
      setMsg(e instanceof Error ? e.message : "Error de red");
    }
  }

  return (
    <span className="inline-flex items-center gap-3">
      <button
        onClick={trigger}
        disabled={state === "loading"}
        className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state === "loading" ? "Encolando…" : "Crawlear ahora"}
      </button>
      {msg && (
        <span
          className={`text-xs ${state === "error" ? "text-rose-400" : "text-zinc-400"}`}
        >
          {msg}
        </span>
      )}
    </span>
  );
}
