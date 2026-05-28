"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

type ChatMsg = { role: "user" | "assistant"; content: string };

function renderMd(md: string): string {
  return DOMPurify.sanitize(marked.parse(md, { async: false, gfm: true }));
}

const SUGERENCIAS = [
  "¿Cómo creo un producto en Vidroop?",
  "¿Qué medios de pago se integran?",
  "¿Cómo funciona el área de Gestión?",
  "¿Qué bugs conocidos tiene la plataforma?",
];

export default function CopilotoPage() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      const res = await fetch("/api/copiloto", {
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
      setError("No pude conectar con el copiloto.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 font-sans">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div>
            <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-100">
              ← inicio
            </Link>
            <h1 className="mt-1 text-xl font-bold">Copiloto de Vidroop</h1>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => {
                setMessages([]);
                setError(null);
              }}
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
              Preguntá lo que quieras sobre cómo funciona Vidroop. Respondo usando toda la base de
              conocimiento de la plataforma.
            </p>
            <div className="mt-6 grid w-full max-w-md gap-2">
              {SUGERENCIAS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-lg border border-zinc-800 px-4 py-2 text-left text-sm text-zinc-300 hover:border-emerald-600/60 hover:bg-zinc-900/40"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
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
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-500">
                  pensando…
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
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="mt-4 flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribí tu pregunta sobre Vidroop…"
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
          Puede equivocarse. Verificá lo importante en la sección{" "}
          <Link href="/vidroop" className="underline hover:text-zinc-400">
            Cómo funciona Vidroop
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
