"use client";

import { useEffect, useRef, useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

type ChatMsg = { role: "user" | "assistant"; content: string };

function renderMd(md: string): string {
  return DOMPurify.sanitize(marked.parse(md, { async: false, gfm: true }));
}

/** Detecta si una respuesta del agente contiene un borrador de artículo (tiene un # heading). */
function isDraft(content: string): boolean {
  return /^#{1,3} .+/m.test(content);
}

export default function AgenteNormalizadorPage() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedIdx, setSavedIdx] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    setError(null);
    const next = [...messages, { role: "user" as const, content: q }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/agente", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "Algo salió mal.");
      } else {
        setMessages([...next, { role: "assistant", content: data.reply }]);
      }
    } catch {
      setError("No pude conectar con el agente.");
    } finally {
      setLoading(false);
    }
  }

  // Índice global del último mensaje asistente que tiene un borrador
  const lastDraftIdx = messages.reduce<number | null>(
    (acc, m, i) => (m.role === "assistant" && isDraft(m.content) ? i : acc),
    null,
  );

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 font-sans">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Normalizador</h1>
            <p className="mt-0.5 text-xs text-zinc-500">Generá artículos para el help desk de Vidroop</p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => { setMessages([]); setError(null); setSavedIdx(null); }}
              className="text-sm text-zinc-400 hover:text-zinc-100"
            >
              limpiar
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-6">
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="max-w-md text-zinc-400">
              Describí el artículo que querés generar: tema, tono (formal / simple / técnico) y audiencia.
              El agente busca en la base de conocimiento antes de redactar.
            </p>
            <p className="mt-3 max-w-md text-xs text-zinc-600">
              Cuando el agente muestre el borrador, aparece el botón <strong className="text-zinc-400">💾 Guardar artículo</strong> para publicarlo en el help desk.
            </p>
          </div>
        ) : (
          <div className="flex-1 space-y-4">
            {messages.map((m, i) => (
              <div key={i}>
                <div className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  {m.role === "user" ? (
                    <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-emerald-700/80 px-4 py-2.5 text-sm leading-relaxed text-emerald-50">
                      {m.content}
                    </div>
                  ) : (
                    <div
                      className="md-body md-chat max-w-[85%] rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm"
                      dangerouslySetInnerHTML={{ __html: renderMd(m.content) }}
                    />
                  )}
                </div>

                {/* Botón guardar: solo en el último borrador del agente */}
                {m.role === "assistant" && isDraft(m.content) && i === lastDraftIdx && (
                  <div className="mt-2 flex justify-start pl-1">
                    {savedIdx === i ? (
                      <span className="flex items-center gap-1.5 rounded-lg border border-emerald-700/50 bg-emerald-950/40 px-4 py-2 text-sm text-emerald-400">
                        ✅ Artículo guardado en el help desk
                      </span>
                    ) : (
                      <button
                        onClick={() => { setSavedIdx(i); send("guardalo en la base de datos"); }}
                        disabled={loading}
                        className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 transition hover:border-emerald-600/60 hover:text-emerald-300 disabled:opacity-40"
                      >
                        💾 Guardar artículo en el help desk
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-500">
                  procesando…
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-rose-900/60 bg-rose-950/30 px-4 py-2 text-sm text-rose-300">
            {error}
          </div>
        )}

        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="mt-4 flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ej: Creá un artículo sobre cómo crear un producto, tono simple, para usuarios finales"
            className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm outline-none placeholder:text-zinc-600 focus:border-emerald-600/60"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-lg bg-emerald-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-40"
          >
            Enviar
          </button>
        </form>

        <p className="mt-2 text-center text-xs text-zinc-600">
          Podés pedir cambios antes de guardar. Una vez guardado, el artículo aparece en el help desk.
        </p>
      </main>
    </div>
  );
}
