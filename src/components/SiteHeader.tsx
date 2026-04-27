"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { formatCoins } from "@/lib/format";

type Props = {
  user: { id: string; username: string; balance: number; avatarUrl: string | null } | null;
};

const NAV = [
  { href: "/", label: "Кейсы" },
  { href: "/upgrade", label: "Апгрейд" },
  { href: "/contracts", label: "Контракты" },
];

export function SiteHeader({ user }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [bumpKey, setBumpKey] = useState(0);

  async function topUp() {
    setBusy(true);
    try {
      const res = await fetch("/api/me/topup", { method: "POST" });
      if (res.ok) {
        setBumpKey((k) => k + 1);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.refresh();
      router.push("/");
    } finally {
      setBusy(false);
    }
  }

  return (
    <header className="border-b border-white/5 bg-[color:rgb(13_16_25_/_0.78)] backdrop-blur-xl sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
        <Link href="/" className="font-extrabold tracking-tight text-lg flex items-center gap-2">
          <span className="inline-flex w-8 h-8 rounded-md bg-gradient-to-br from-orange-400 to-amber-500 items-center justify-center text-black text-base shadow-[0_4px_18px_-4px_rgba(255,122,26,0.6)]">
            ★
          </span>
          <span>
            <span className="text-orange-400">CASE</span>
            <span className="text-white">-BATTLE</span>
          </span>
          <span className="ml-1 text-[10px] uppercase text-orange-300/80 align-middle border border-orange-400/40 rounded px-1 py-px">demo</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-4 text-sm">
          {NAV.map((n) => (
            <NavLink key={n.href} href={n.href} label={n.label} active={pathname === n.href} />
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <button
                onClick={topUp}
                disabled={busy}
                className="btn-ghost text-xs"
                title="Добавить демо-монеты"
              >
                +1000
              </button>
              <div key={bumpKey} className="coin-pill text-sm animate-[drop-reveal_400ms_ease-out]">
                <span className="text-orange-300">{formatCoins(user.balance)}</span>
                <span className="text-xs text-[color:var(--muted)]">монет</span>
              </div>
              <Link href="/profile" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition">
                <span className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-xs font-bold text-black">
                  {user.username[0]?.toUpperCase()}
                </span>
                <span className="text-sm">{user.username}</span>
              </Link>
              <button onClick={logout} disabled={busy} className="text-xs text-[color:var(--muted)] hover:text-white">
                Выйти
              </button>
            </>
          ) : (
            <Link href="/login" className="btn-primary text-sm">
              Войти
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`relative px-3 py-2 rounded-md text-sm transition ${
        active ? "text-white" : "text-white/70 hover:text-white hover:bg-white/5"
      }`}
    >
      {label}
      {active && (
        <span className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-orange-400 to-amber-500" />
      )}
    </Link>
  );
}
