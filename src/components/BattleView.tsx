"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RARITY_COLOR } from "@/lib/rarity";
import { formatCoins } from "@/lib/format";

type CaseInfo = { id: string; slug: string; name: string; imageUrl: string };
type SeatInfo = { seat: number; userId: string | null; isBot: boolean; total: number; username: string | null };
type Battle = {
  id: string;
  mode: string;
  size: number;
  status: string;
  totalPrice: number;
  winnerSeat: number | null;
  createdById: string;
  cases: CaseInfo[];
  seats: SeatInfo[];
};
type Opening = {
  seat: number;
  caseId: string;
  itemName: string;
  itemImage: string;
  rarity: string;
  price: number;
};

type Props = {
  battle: Battle;
  openings: Opening[];
  currentUserId: string | null;
};

export function BattleView({ battle, openings, currentUserId }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [revealStep, setRevealStep] = useState(0);

  const isCreator = currentUserId && currentUserId === battle.createdById;
  const inBattle = battle.seats.some((s) => s.userId === currentUserId);
  const finished = battle.status === "finished";

  const totalRounds = battle.cases.length;

  // Animate reveal of rounds for finished battles.
  useEffect(() => {
    if (!finished) {
      setRevealStep(totalRounds);
      return;
    }
    setRevealStep(0);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setRevealStep(i);
      if (i >= totalRounds) clearInterval(interval);
    }, 1500);
    return () => clearInterval(interval);
  }, [finished, totalRounds, battle.id]);

  // Auto-refresh while waiting/rolling.
  useEffect(() => {
    if (finished) return;
    const t = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(t);
  }, [finished, router]);

  async function join() {
    setBusy("join");
    try {
      const res = await fetch(`/api/battles/${battle.id}/join`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) alert(data.error);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function start() {
    setBusy("start");
    try {
      const res = await fetch(`/api/battles/${battle.id}/start`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) alert(data.error);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  // Group openings by (seat, caseId).
  const matrix = useMemo(() => {
    const m = new Map<string, Opening>();
    for (const o of openings) m.set(`${o.seat}-${o.caseId}`, o);
    return m;
  }, [openings]);

  const seatTotals = useMemo(() => {
    const totals = new Map<number, number>();
    battle.seats.forEach((s) => totals.set(s.seat, 0));
    for (let i = 0; i < Math.min(revealStep, totalRounds); i++) {
      const caseId = battle.cases[i].id;
      for (const seat of battle.seats) {
        const o = matrix.get(`${seat.seat}-${caseId}`);
        if (o) totals.set(seat.seat, (totals.get(seat.seat) ?? 0) + o.price);
      }
    }
    return totals;
  }, [revealStep, totalRounds, battle.cases, battle.seats, matrix]);

  return (
    <div className="space-y-6">
      <div className="card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-[color:var(--muted)]">{battle.mode} · {battle.cases.length} кейс(ов)</div>
          <h1 className="text-xl font-bold">Баттл</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm">
            Сумма: <span className="text-orange-300 font-bold">{formatCoins(battle.totalPrice)}</span> монет
          </div>
          {!finished && !inBattle && (
            <button onClick={join} disabled={busy === "join"} className="btn-primary">
              {busy === "join" ? "..." : `Войти (${formatCoins(battle.totalPrice)})`}
            </button>
          )}
          {!finished && isCreator && (
            <button onClick={start} disabled={busy === "start"} className="btn-primary">
              {busy === "start" ? "..." : "Старт"}
            </button>
          )}
          {finished && (
            <span className="text-emerald-300 text-sm font-bold">
              Победитель: место #{(battle.winnerSeat ?? 0) + 1}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${battle.seats.length}, minmax(0, 1fr))` }}>
        {battle.seats.map((s) => {
          const isWinner = finished && battle.winnerSeat === s.seat && revealStep >= totalRounds;
          return (
            <div
              key={s.seat}
              className={`card p-3 ${isWinner ? "border-emerald-400/60 ring-1 ring-emerald-400/40" : ""}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold truncate">
                  {s.username ?? (s.isBot ? "Бот" : "пусто")}
                </div>
                <div className="text-orange-300 text-xs font-bold">
                  {formatCoins(seatTotals.get(s.seat) ?? 0)}
                </div>
              </div>
              <div className="space-y-2">
                {battle.cases.map((bc, i) => {
                  const o = matrix.get(`${s.seat}-${bc.id}`);
                  const revealed = i < revealStep;
                  return (
                    <div
                      key={bc.id + "-" + i}
                      className="aspect-[3/2] rounded bg-black/30 border border-white/10 flex items-center justify-center p-2 relative overflow-hidden"
                      style={revealed && o ? { borderColor: RARITY_COLOR[o.rarity] } : undefined}
                    >
                      {!revealed ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={bc.imageUrl} alt={bc.name} className="max-h-full max-w-full object-contain opacity-60 animate-pulse" />
                      ) : o ? (
                        <div className="flex flex-col items-center justify-center w-full">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={o.itemImage} alt={o.itemName} className="max-h-12 max-w-full object-contain" />
                          <div className="text-[10px] truncate w-full text-center mt-1">{o.itemName.split("|")[1]?.trim() ?? o.itemName}</div>
                          <div className="text-orange-300 text-[10px] font-bold">{formatCoins(o.price)}</div>
                        </div>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={bc.imageUrl} alt={bc.name} className="max-h-full max-w-full object-contain" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-xs text-[color:var(--muted)]">ID: {battle.id}</div>
    </div>
  );
}
