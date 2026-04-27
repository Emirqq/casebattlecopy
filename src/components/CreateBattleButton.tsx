"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCoins } from "@/lib/format";

type CaseOption = { id: string; slug: string; name: string; price: number; imageUrl: string };

type Props = {
  loggedIn: boolean;
  balance: number;
  cases: CaseOption[];
};

const MODES = [
  { id: "1v1", label: "1 vs 1", size: 2 },
  { id: "1v1v1", label: "1 vs 1 vs 1", size: 3 },
  { id: "2v2", label: "2 vs 2", size: 4 },
];

export function CreateBattleButton({ loggedIn, balance, cases }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(MODES[0]);
  const [picked, setPicked] = useState<{ id: string; slug: string; name: string; price: number; imageUrl: string }[]>([]);
  const [busy, setBusy] = useState(false);

  const total = picked.reduce((s, c) => s + c.price, 0);

  function addCase(c: CaseOption) {
    if (picked.length >= 10) return;
    setPicked([...picked, c]);
  }
  function removeCase(idx: number) {
    setPicked(picked.filter((_, i) => i !== idx));
  }

  async function create() {
    if (picked.length === 0) return;
    if (total > balance) return;
    setBusy(true);
    try {
      const res = await fetch("/api/battles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: mode.id, size: mode.size, caseIds: picked.map((c) => c.id) }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Ошибка");
        setBusy(false);
        return;
      }
      router.push(`/battles/${data.battleId}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!loggedIn) {
    return <Link href="/login" className="btn-primary">Войти, чтобы создать</Link>;
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">Создать баттл</button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-2" onClick={() => setOpen(false)}>
          <div
            className="bg-[var(--background-elevated)] rounded-2xl border border-white/10 w-full max-w-3xl max-h-[90vh] overflow-auto scrollbar-thin"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-bold text-lg">Новый баттл</h3>
              <button onClick={() => setOpen(false)} className="text-[color:var(--muted)] hover:text-white">✕</button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <div className="text-sm uppercase tracking-wider text-[color:var(--muted)] mb-2">Режим</div>
                <div className="grid grid-cols-3 gap-2">
                  {MODES.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMode(m)}
                      className={`btn-ghost ${mode.id === m.id ? "!bg-orange-500/20 !border-orange-400/50" : ""}`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm uppercase tracking-wider text-[color:var(--muted)]">Кейсы</div>
                  <div className="text-sm">
                    Сумма: <span className="text-orange-300 font-bold">{formatCoins(total)}</span>
                    <span className="text-[color:var(--muted)]"> / Баланс: {formatCoins(balance)}</span>
                  </div>
                </div>
                {picked.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-2 mb-2">
                    {picked.map((c, i) => (
                      <div key={i} onClick={() => removeCase(i)} className="card p-2 cursor-pointer relative shrink-0 w-24">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={c.imageUrl} alt={c.name} className="aspect-square object-contain" />
                        <div className="text-[10px] truncate">{c.name}</div>
                        <div className="text-orange-300 text-[11px] font-bold">{formatCoins(c.price)}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {cases.map((c) => (
                    <button key={c.id} onClick={() => addCase(c)} className="card p-2 text-left hover:border-orange-400/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c.imageUrl} alt={c.name} className="aspect-square object-contain" />
                      <div className="text-xs truncate">{c.name}</div>
                      <div className="text-orange-300 text-xs font-bold">{formatCoins(c.price)}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-[var(--background-elevated)]">
                <button className="btn-ghost" onClick={() => setOpen(false)}>Отмена</button>
                <button
                  onClick={create}
                  disabled={busy || picked.length === 0 || total > balance}
                  className="btn-primary"
                >
                  {busy ? "Создаём…" : `Создать (${formatCoins(total)})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
