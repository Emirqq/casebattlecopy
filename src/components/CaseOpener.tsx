"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Link from "next/link";
import { RARITY_COLOR, RARITY_LABEL_RU } from "@/lib/rarity";
import { formatCoins } from "@/lib/format";

type Item = {
  id: string;
  name: string;
  weapon: string | null;
  imageUrl: string;
  price: number;
  rarity: string;
};

type Won = Item & { inventoryId: string };

type Props = {
  slug: string;
  price: number;
  items: Item[];
  userBalance: number | null;
  loggedIn: boolean;
};

const REEL_LENGTH = 60;
const WINNER_INDEX = 50;
const COUNT_OPTIONS = [1, 2, 3, 5, 10] as const;

type Count = (typeof COUNT_OPTIONS)[number];

export function CaseOpener({ slug, price, items, userBalance, loggedIn }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [reels, setReels] = useState<Item[][] | null>(null);
  const [winners, setWinners] = useState<Won[] | null>(null);
  const [soldIds, setSoldIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<Count>(1);
  const [fast, setFast] = useState(false);

  const totalPrice = price * count;
  const canAfford = userBalance !== null && userBalance >= totalPrice;

  const buildReel = (winner: Item): Item[] => {
    const arr: Item[] = [];
    for (let i = 0; i < REEL_LENGTH; i++) {
      arr.push(items[Math.floor(Math.random() * items.length)]);
    }
    arr[WINNER_INDEX] = winner;
    return arr;
  };

  async function open() {
    if (busy || !loggedIn || !canAfford) return;
    setBusy(true);
    setError(null);
    setWinners(null);
    setReels(null);
    setSoldIds(new Set());
    try {
      const res = await fetch(`/api/case/${slug}/open`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка");
        setBusy(false);
        return;
      }
      const wonItems: Won[] = data.items;
      const newReels = wonItems.map(buildReel);
      setReels(newReels);

      const duration = fast ? 1500 : 6200;
      setTimeout(() => {
        setWinners(wonItems);
        setBusy(false);
        router.refresh();
      }, duration);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
      setBusy(false);
    }
  }

  function reset() {
    setReels(null);
    setWinners(null);
    setError(null);
    setSoldIds(new Set());
  }

  async function sell(inventoryId: string) {
    if (soldIds.has(inventoryId)) return;
    setSoldIds((s) => {
      const n = new Set(s);
      n.add(inventoryId);
      return n;
    });
    try {
      const res = await fetch("/api/me/inventory/sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventoryId }),
      });
      if (res.ok) router.refresh();
      else {
        // Roll back optimistic flag on failure.
        setSoldIds((s) => {
          const n = new Set(s);
          n.delete(inventoryId);
          return n;
        });
      }
    } catch {
      setSoldIds((s) => {
        const n = new Set(s);
        n.delete(inventoryId);
        return n;
      });
    }
  }

  async function sellAll() {
    if (!winners) return;
    const remaining = winners.filter((w) => !soldIds.has(w.inventoryId));
    if (remaining.length === 0) return;
    setSoldIds(new Set(winners.map((w) => w.inventoryId)) as Set<string>);
    try {
      await Promise.all(
        remaining.map((w) =>
          fetch("/api/me/inventory/sell", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inventoryId: w.inventoryId }),
          })
        )
      );
      router.refresh();
    } catch {
      // No-op; partial state will be visible via balance refresh.
    }
  }

  const reelsToRender: (Item[] | null)[] = useMemo(() => {
    if (reels) return reels;
    return Array.from({ length: count }, () => null);
  }, [reels, count]);

  const showCompactReels = count >= 5;

  return (
    <div className="card p-4 space-y-4">
      {/* Top toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="panel-title mr-1">Кейсов сразу</span>
          {COUNT_OPTIONS.map((c) => (
            <button
              key={c}
              onClick={() => !busy && setCount(c)}
              disabled={busy}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition ${
                count === c
                  ? "bg-orange-500/20 border-orange-400 text-orange-200"
                  : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
              }`}
            >
              ×{c}
            </button>
          ))}
        </div>
        <label className="inline-flex items-center gap-2 text-sm select-none cursor-pointer">
          <span className={`relative inline-block w-10 h-6 rounded-full transition ${fast ? "bg-orange-500" : "bg-white/10"}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition ${fast ? "left-[18px]" : "left-0.5"}`} />
          </span>
          <input type="checkbox" className="sr-only" checked={fast} onChange={(e) => setFast(e.target.checked)} disabled={busy} />
          <span className="text-white/80">Быстрое открытие</span>
        </label>
      </div>

      {/* Reels grid (or single reel) */}
      <div
        className={`grid gap-3 ${
          count === 1
            ? "grid-cols-1"
            : count === 2
            ? "grid-cols-1 md:grid-cols-2"
            : count === 3
            ? "grid-cols-1 md:grid-cols-3"
            : count === 5
            ? "grid-cols-2 md:grid-cols-5"
            : "grid-cols-2 md:grid-cols-5"
        }`}
      >
        {reelsToRender.map((r, i) => (
          <Reel
            key={i}
            reel={r}
            winnerIdx={WINNER_INDEX}
            won={winners?.[i] ?? null}
            fast={fast}
            compact={showCompactReels}
          />
        ))}
      </div>

      {/* Action / result panel */}
      {!loggedIn ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[color:var(--muted)]">Войдите, чтобы открывать кейсы.</p>
          <Link href="/login" className="btn-primary">Войти</Link>
        </div>
      ) : winners ? (
        <WinnersPanel
          winners={winners}
          onReset={reset}
          onSell={sell}
          onSellAll={sellAll}
          soldIds={soldIds}
        />
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="text-sm text-[color:var(--muted)]">
            Баланс: <span className="text-orange-300 font-semibold">{formatCoins(userBalance ?? 0)}</span> монет
            {count > 1 && (
              <span className="ml-2">· Стоимость <span className="text-orange-300 font-semibold">{formatCoins(totalPrice)}</span></span>
            )}
          </div>
          <button onClick={open} disabled={busy || !canAfford} className="btn-primary">
            {busy ? "Крутим…" : count > 1 ? `Открыть ×${count} за ${formatCoins(totalPrice)}` : `Открыть за ${formatCoins(totalPrice)}`}
          </button>
        </div>
      )}
      {error && <div className="text-sm text-red-400">{error}</div>}
    </div>
  );
}

function WinnersPanel({
  winners,
  onReset,
  onSell,
  onSellAll,
  soldIds,
}: {
  winners: Won[];
  onReset: () => void;
  onSell: (id: string) => void;
  onSellAll: () => void;
  soldIds: Set<string>;
}) {
  const total = winners.reduce((s, w) => s + w.price, 0);
  const remaining = winners.reduce((s, w) => s + (soldIds.has(w.inventoryId) ? 0 : w.price), 0);
  const isMulti = winners.length > 1;

  if (!isMulti) {
    const w = winners[0];
    const sold = soldIds.has(w.inventoryId);
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col items-center gap-3 drop-reveal">
        <div
          className="w-32 h-32 rounded-lg bg-white/5 flex items-center justify-center border-2"
          style={{
            borderColor: RARITY_COLOR[w.rarity],
            boxShadow: `0 0 36px -4px ${RARITY_COLOR[w.rarity]}`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={w.imageUrl} alt={w.name} className="max-w-full max-h-full object-contain" />
        </div>
        <div className="text-center">
          <div className="text-xs uppercase tracking-wider" style={{ color: RARITY_COLOR[w.rarity] }}>
            {RARITY_LABEL_RU[w.rarity] ?? w.rarity}
          </div>
          <div className="font-semibold text-lg">{w.name}</div>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => onSell(w.inventoryId)}
            disabled={sold}
            className="btn-ghost"
          >
            {sold ? "Продано" : `Продать за ${formatCoins(w.price)}`}
          </button>
          <button onClick={onReset} className="btn-primary">
            Ещё
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm">
          Получено: <span className="text-orange-300 font-bold text-lg">{formatCoins(total)}</span> монет общей стоимости
          {remaining !== total && (
            <span className="ml-2 text-[color:var(--muted)]">
              · осталось <span className="text-orange-300 font-semibold">{formatCoins(remaining)}</span>
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={onSellAll} disabled={remaining === 0} className="btn-ghost">
            Продать всё за {formatCoins(remaining)}
          </button>
          <button onClick={onReset} className="btn-primary">Ещё</button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {winners.map((w) => {
          const sold = soldIds.has(w.inventoryId);
          return (
            <div
              key={w.inventoryId}
              className={`rounded-lg border p-2 flex flex-col items-center bg-black/30 transition ${sold ? "opacity-40" : ""}`}
              style={{
                borderColor: `${RARITY_COLOR[w.rarity]}88`,
                boxShadow: sold ? undefined : `0 0 14px -4px ${RARITY_COLOR[w.rarity]}`,
              }}
            >
              <div
                className="rarity-bar w-full mb-1"
                style={{ background: RARITY_COLOR[w.rarity] }}
              />
              <div className="aspect-[4/3] w-full flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={w.imageUrl} alt={w.name} className="max-w-full max-h-full object-contain" />
              </div>
              <div className="text-[11px] text-center mt-1 truncate w-full">
                {w.name.split("|")[1]?.trim() ?? w.name}
              </div>
              <button
                onClick={() => onSell(w.inventoryId)}
                disabled={sold}
                className="mt-1 w-full text-[11px] py-1 rounded-md bg-orange-500/15 hover:bg-orange-500/25 text-orange-200 border border-orange-400/30 disabled:opacity-50"
              >
                {sold ? "Продано" : `Продать за ${formatCoins(w.price)}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Reel({
  reel,
  winnerIdx,
  won,
  fast,
  compact,
}: {
  reel: Item[] | null;
  winnerIdx: number;
  won: Item | null;
  fast: boolean;
  compact: boolean;
}) {
  const CARD_WIDTH = compact ? 96 : 128;
  const GAP = 12;
  const STEP = CARD_WIDTH + GAP;
  const offset = useMemo(() => {
    if (!reel) return 0;
    return -(winnerIdx * STEP + CARD_WIDTH / 2);
  }, [reel, winnerIdx, STEP, CARD_WIDTH]);

  const animClass = won ? "" : fast ? "roll-animation-fast" : "roll-animation";

  return (
    <div className={`relative ${compact ? "h-32" : "h-44"} rounded-lg bg-black/40 border border-white/10 overflow-hidden`}>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_0,transparent_30%,transparent_70%,rgba(255,255,255,0.04)_100%)] pointer-events-none" />
      <div className="absolute top-0 bottom-0 left-1/2 w-px bg-orange-400/80 z-10 pointer-events-none shadow-[0_0_12px_rgba(255,122,26,0.7)]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <div className="w-3 h-3 bg-orange-400 rotate-45 -mt-1.5" />
      </div>
      {reel ? (
        <div
          className={`flex absolute top-1/2 left-1/2 gap-3 ${animClass}`}
          style={
            won
              ? { transform: `translate(${offset}px, -50%)` }
              : ({ transform: "translate(0, -50%)", ["--roll-end" as string]: `${offset}px` } as React.CSSProperties)
          }
        >
          {reel.map((it, i) => {
            const isWinner = won && i === winnerIdx;
            return (
              <div
                key={i}
                className={`shrink-0 ${compact ? "w-24 h-28" : "w-32 h-36"} rounded-lg border bg-[var(--background-card)] flex flex-col items-center justify-center p-2 transition-all`}
                style={{
                  borderColor: isWinner ? RARITY_COLOR[it.rarity] : `${RARITY_COLOR[it.rarity] ?? "#444"}55`,
                  boxShadow: isWinner ? `0 0 30px -4px ${RARITY_COLOR[it.rarity]}` : undefined,
                }}
              >
                <div className="rarity-bar w-full mb-1" style={{ background: RARITY_COLOR[it.rarity] ?? "#888" }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.imageUrl} alt={it.name} className="max-h-[60%] max-w-full object-contain" />
                <div className={`${compact ? "text-[10px]" : "text-xs"} text-center mt-1 truncate w-full`}>
                  {it.name.split("|")[1]?.trim() ?? it.name}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-[color:var(--muted)] text-sm">
          Нажми «Открыть», чтобы запустить рулетку
        </div>
      )}
    </div>
  );
}
