"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatCoins } from "@/lib/format";

type Props = {
  user: { id: string; username: string; balance: number; avatarUrl: string | null } | null;
};

export function SiteHeader({ user }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function topUp() {
    setBusy(true);
    try {
      const res = await fetch("/api/me/topup", { method: "POST" });
      if (res.ok) router.refresh();
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
    <header className="border-b border-white/5 bg-[var(--background-elevated)]/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
        <Link href="/" className="font-extrabold tracking-tight text-lg">
          <span className="text-orange-400">CASE</span>
          <span className="text-white">-BATTLE</span>
          <span className="ml-2 text-[10px] uppercase text-orange-300/80 align-middle">demo</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-4 text-sm">
          <NavLink href="/" label="Кейсы" />
          <NavLink href="/battles" label="Баттлы" />
          <NavLink href="/upgrade" label="Апгрейд" />
          <NavLink href="/contracts" label="Контракты" />
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
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                <span className="text-orange-300 font-bold">{formatCoins(user.balance)}</span>
                <span className="text-xs text-[color:var(--muted)]">монет</span>
              </div>
              <Link href="/profile" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10">
                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-xs font-bold">
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

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="px-3 py-2 rounded-md text-white/80 hover:text-white hover:bg-white/5"
    >
      {label}
    </Link>
  );
}
