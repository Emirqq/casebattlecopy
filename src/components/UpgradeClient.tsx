"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RARITY_COLOR } from "@/lib/rarity";
import { formatCoins } from "@/lib/format";

type Item = {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  rarity: string;
  weapon: string | null;
};

type InventoryEntry = Item & { itemId: string };

type Props = {
  balance: number;
  inventory: InventoryEntry[];
  allItems: Item[];
};

const HOUSE_EDGE = 0.92; // 92% return — chance is sourceValue/targetPrice * 0.92

export function UpgradeClient({ balance, inventory, allItems }: Props) {
  const router = useRouter();
  const [sourceMode, setSourceMode] = useState<"item" | "balance">("item");
  const [sourceInvId, setSourceInvId] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState<number>(100);
  const [targetItemId, setTargetItemId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<null | { won: boolean; chance: number; angle: number; targetName?: string }>(null);
  const [search, setSearch] = useState("");

  const sourceValue = useMemo(() => {
    if (sourceMode === "balance") return Math.max(0, Math.floor(betAmount));
    if (!sourceInvId) return 0;
    return inventory.find((i) => i.id === sourceInvId)?.price ?? 0;
  }, [sourceMode, sourceInvId, betAmount, inventory]);

  const target = allItems.find((i) => i.id === targetItemId) ?? null;

  const chance = useMemo(() => {
    if (!target || sourceValue <= 0) return 0;
    const c = (sourceValue / target.price) * HOUSE_EDGE;
    return Math.min(0.95, Math.max(0, c));
  }, [target, sourceValue]);

  const filteredTargets = useMemo(() => {
    return allItems
      .filter((i) => i.price > sourceValue)
      .filter((i) => !search || i.name.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 60);
  }, [allItems, sourceValue, search]);

  async function attempt() {
    if (busy || !target || sourceValue <= 0) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/upgrade/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: sourceMode === "item" ? { type: "item", inventoryId: sourceInvId } : { type: "balance", amount: betAmount },
          targetItemId: target.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Ошибка");
        setBusy(false);
        return;
      }
      const angle = data.won ? 90 + data.chance * 360 * 0.5 - 30 : 270;
      setResult({ won: data.won, chance: data.chance, angle, targetName: target.name });
      setTimeout(() => {
        router.refresh();
        setSourceInvId(null);
      }, 2200);
    } finally {
      setTimeout(() => setBusy(false), 2200);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold uppercase">Апгрейд</h1>
      <p className="text-[color:var(--muted)] text-sm -mt-3">
        Выбери, что ставишь (предмет из инвентаря или монеты), и выбери цель — чем дороже цель, тем меньше шанс.
      </p>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-4 space-y-4">
          <div className="flex gap-2">
            <button
              className={`btn-ghost flex-1 ${sourceMode === "item" ? "!bg-orange-500/20 !border-orange-400/50" : ""}`}
              onClick={() => setSourceMode("item")}
            >
              Предмет
            </button>
            <button
              className={`btn-ghost flex-1 ${sourceMode === "balance" ? "!bg-orange-500/20 !border-orange-400/50" : ""}`}
              onClick={() => setSourceMode("balance")}
            >
              Монеты
            </button>
          </div>
          {sourceMode === "balance" ? (
            <div>
              <label className="text-sm block mb-1">Ставка (макс {formatCoins(balance)})</label>
              <input
                type="number"
                min={10}
                max={balance}
                value={betAmount}
                onChange={(e) => setBetAmount(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2"
              />
            </div>
          ) : (
            <div className="max-h-72 overflow-auto scrollbar-thin grid grid-cols-2 sm:grid-cols-3 gap-2">
              {inventory.length === 0 && (
                <div className="col-span-full text-sm text-[color:var(--muted)] p-4 text-center">
                  Инвентарь пуст. Открой кейс или используй монеты.
                </div>
              )}
              {inventory.map((it) => (
                <button
                  key={it.id}
                  onClick={() => setSourceInvId(it.id)}
                  className={`text-left card p-2 ${sourceInvId === it.id ? "ring-2 ring-orange-400" : ""}`}
                  style={{ borderColor: `${RARITY_COLOR[it.rarity]}55` }}
                >
                  <div className="aspect-[4/3] flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.imageUrl} alt={it.name} className="max-h-full max-w-full object-contain" />
                  </div>
                  <div className="text-[11px] truncate">{it.name}</div>
                  <div className="text-orange-300 text-xs font-bold">{formatCoins(it.price)}</div>
                </button>
              ))}
            </div>
          )}
          <div className="text-sm text-[color:var(--muted)]">
            Стоимость ставки: <span className="text-orange-300 font-bold">{formatCoins(sourceValue)}</span> монет
          </div>
        </div>

        <div className="card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Цель</h3>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск…"
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm"
            />
          </div>
          <div className="max-h-72 overflow-auto scrollbar-thin grid grid-cols-2 sm:grid-cols-3 gap-2">
            {filteredTargets.length === 0 && sourceValue <= 0 && (
              <div className="col-span-full text-sm text-[color:var(--muted)] p-4 text-center">
                Сначала выбери ставку.
              </div>
            )}
            {filteredTargets.map((it) => (
              <button
                key={it.id}
                onClick={() => setTargetItemId(it.id)}
                className={`text-left card p-2 ${targetItemId === it.id ? "ring-2 ring-orange-400" : ""}`}
                style={{ borderColor: `${RARITY_COLOR[it.rarity]}55` }}
              >
                <div className="aspect-[4/3] flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.imageUrl} alt={it.name} className="max-h-full max-w-full object-contain" />
                </div>
                <div className="text-[11px] truncate">{it.name}</div>
                <div className="text-orange-300 text-xs font-bold">{formatCoins(it.price)}</div>
              </button>
            ))}
          </div>
          {target && (
            <div className="text-sm">
              Цель: <span className="font-semibold">{target.name}</span> ·
              шанс <span className="text-orange-300 font-bold">{(chance * 100).toFixed(2)}%</span>
            </div>
          )}
          <button onClick={attempt} disabled={busy || !target || sourceValue <= 0} className="btn-primary w-full">
            {busy ? "Кручу…" : "Попытаться"}
          </button>
          {result && (
            <div
              className={`mt-2 rounded-lg p-3 text-center font-bold ${
                result.won ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/30" : "bg-red-400/10 text-red-300 border border-red-400/30"
              }`}
            >
              {result.won ? `Поздравляем! Получено: ${result.targetName}` : "Проигрыш. Ставка сгорела."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
