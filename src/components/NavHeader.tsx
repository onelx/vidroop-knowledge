"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/",              label: "Inicio" },
  { href: "/vidroop",       label: "Cómo funciona" },
  { href: "/copiloto",      label: "Copiloto IA" },
  { href: "/admin",         label: "Crawl" },
  { href: "/admin/agente",  label: "Normalizador", badge: "Admin" },
];

export default function NavHeader() {
  const path = usePathname();

  function isActive(href: string) {
    if (href === "/") return path === "/";
    return path.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
        {/* Logo */}
        <Link
          href="/"
          className="flex-shrink-0 text-sm font-bold text-zinc-100 hover:text-emerald-400 transition"
        >
          Vidroop<span className="text-emerald-500">KB</span>
        </Link>

        {/* Nav links — scroll horizontal en móvil */}
        <nav className="flex flex-1 items-center gap-1 overflow-x-auto scrollbar-none">
          {NAV.map(({ href, label, badge }) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition whitespace-nowrap
                ${isActive(href)
                  ? "bg-emerald-600/20 text-emerald-300 font-medium"
                  : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100"
                }`}
            >
              {label}
              {badge && (
                <span className="rounded bg-zinc-700/80 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
                  {badge}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
