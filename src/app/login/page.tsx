"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка");
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10 card p-6">
      <h1 className="text-2xl font-bold mb-1">Вход</h1>
      <p className="text-sm text-[color:var(--muted)] mb-6">
        Демо-режим: придумай ник — аккаунт создастся автоматически. Никаких паролей и платежей.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-sm font-medium block mb-1">Ник</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={2}
            maxLength={24}
            placeholder="например, ninja_42"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-orange-400/60"
          />
        </div>
        {error && <div className="text-sm text-red-400">{error}</div>}
        <button type="submit" disabled={busy || !username} className="btn-primary w-full">
          Войти / Зарегистрироваться
        </button>
      </form>
    </div>
  );
}
