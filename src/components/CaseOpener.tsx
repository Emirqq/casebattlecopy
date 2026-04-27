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

type Props = {
  slug: string;
  price: number;
  items: Item[];
  userBalance: number | null;
  loggedIn: boolean;
};

const REEL_LENGTH = 60;
const WINNER_INDEX = 50; // position where the winner lands

export function CaseOpener({ slug, price, items, userBalance, loggedIn }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [reel, setReel] = useState<Item[] | null>(null);
  const [won, setWon] = useState<Item | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canAfford = userBalance !== null && userBalance >= price;

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
    setWon(null);
    try {
      const res = await fetch(`/api/case/${slug}/open`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка");
        setBusy(false);
        return;
      }
      const winner: Item = data.item;
      const newReel = buildReel(winner);
      setReel(newReel);

      // Wait for animation, then reveal.
      setTimeout(() => {
        setWon(winner);
        setBusy(false);
        router.refresh();
      }, 6200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
      setBusy(false);
    }
  }

  async function sellLast() {
    if (!won) return;
    setBusy(true);
    try {
      // Find the most recent inventory entry from server.
      const res = await fetch("/api/me/inventory/sell-last", { method: "POST" });
      if (res.ok) {
        setWon(null);
        setReel(null);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setReel(null);
    setWon(null);
    setError(null);
  }

  return (
    <div className="card p-4">
      <Reel reel={reel} winnerIdx={WINNER_INDEX} won={won} />
      {!loggedIn ? (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-[color:var(--muted)]">Войдите, чтобы открывать кейсы.</p>
          <Link href="/login" className="btn-primary">Войти</Link>
        </div>
      ) : won ? (
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-lg bg-white/5 flex items-center justify-center border"
              style={{ borderColor: RARITY_COLOR[won.rarity] }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={won.imageUrl} alt={won.name} className="max-w-full max-h-full object-contain" />
            </div>
            <div>
              <div className="text-xs uppercase" style={{ color: RARITY_COLOR[won.rarity] }}>
                {RARITY_LABEL_RU[won.rarity] ?? won.rarity}
              </div>
              <div className="font-semibold">{won.name}</div>
              <div className="text-orange-300 text-sm font-bold">{formatCoins(won.price)} монет</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={sellLast} disabled={busy} className="btn-ghost">
              Продать за {formatCoins(won.price)}
            </button>
            <button onClick={reset} disabled={busy} className="btn-primary">
              Открыть ещё
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="text-sm text-[color:var(--muted)]">
            Баланс: <span className="text-orange-300 font-semibold">{formatCoins(userBalance ?? 0)}</span> монет
          </div>
          <button
            onClick={open}
            disabled={busy || !canAfford}
            className="btn-primary"
          >
            {busy ? "Открываем…" : `Открыть за ${formatCoins(price)}`}
          </button>
        </div>
      )}
      {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
    </div>
  );
}

function Reel({
  reel,
  winnerIdx,
  won,
}: {
  reel: Item[] | null;
  winnerIdx: number;
  won: Item | null;
}) {
  // Each card is 128px wide + 12px gap.
  const cardWidth = 140;
  const offset = useMemo(() => {
    if (!reel) return 0;
    // We want winner card centered on the marker. Marker sits at viewport center.
    return -(winnerIdx * cardWidth) + cardWidth / 2;
  }, [reel, winnerIdx]);

  return (
    <div className="relative h-44 rounded-lg bg-black/30 border border-white/10 overflow-hidden">
      <div className="absolute top-0 bottom-0 left-1/2 w-px bg-orange-400/80 z-10 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-0 z-10 pointer-events-none">
        <div className="w-3 h-3 bg-orange-400 rotate-45 -mt-1.5" />
      </div>
      {reel ? (
        <div
          className={`flex absolute top-1/2 -translate-y-1/2 left-1/2 gap-3 px-1 ${won ? "" : "roll-animation"}`}
          style={
            won
              ? { transform: `translate(${offset}px, -50%)` }
              : ({ ["--roll-end" as string]: `${offset}px` } as React.CSSProperties)
          }
        >
          {reel.map((it, i) => (
            <ReelCard key={i} item={it} highlight={!!won && i === winnerIdx} />
          ))}
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-[color:var(--muted)] text-sm">
          Нажми «Открыть», чтобы запустить рулетку
        </div>
      )}
    </div>
  );
}

function ReelCard({ item, highlight }: { item: Item; highlight: boolean }) {
  return (
    <div
      className={`shrink-0 w-32 h-36 rounded bg-[var(--background-elevated)] border flex flex-col items-center justify-center p-2 transition`}
      style={{
        borderColor: RARITY_COLOR[item.rarity],
        boxShadow: highlight ? `0 0 0 3px ${RARITY_COLOR[item.rarity]}, 0 0 30px ${RARITY_COLOR[item.rarity]}80` : undefined,
      }}
    >
      <div className="flex-1 flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.imageUrl} alt={item.name} className="max-h-20 max-w-full object-contain" />
      </div>
      <div className="text-[10px] truncate w-full text-center text-white/70">
        {item.name.split("|")[1]?.trim() ?? item.name}
      </div>
    </div>
  );
}
