"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RARITY_COLOR, RARITY_LABEL_RU } from "@/lib/rarity";
import { formatCoins } from "@/lib/format";

export type InventoryEntry = {
  id: string;
  itemId: string;
  name: string;
  imageUrl: string;
  price: number;
  rarity: string;
  weapon: string | null;
};

type Props = {
  items: InventoryEntry[];
  selectable?: boolean;
  selected?: Set<string>;
  onToggle?: (id: string) => void;
};

export function InventoryGrid({ items, selectable, selected, onToggle }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function sell(id: string) {
    setBusyId(id);
    try {
      const res = await fetch("/api/me/inventory/sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventoryId: id }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {items.map((it) => {
        const isSelected = selected?.has(it.id);
        return (
          <div
            key={it.id}
            onClick={selectable ? () => onToggle?.(it.id) : undefined}
            className={`card p-3 relative cursor-${selectable ? "pointer" : "default"} ${isSelected ? "ring-2 ring-orange-400" : ""}`}
            style={{ borderColor: `${RARITY_COLOR[it.rarity] ?? "#444"}55` }}
          >
            <div
              className="rarity-bar mb-2"
              style={{ background: RARITY_COLOR[it.rarity] ?? "#888" }}
            />
            <div className="aspect-[4/3] flex items-center justify-center bg-white/[0.02] rounded">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.imageUrl} alt={it.name} className="max-h-full max-w-full object-contain" loading="lazy" />
            </div>
            <div className="mt-2 text-xs text-[color:var(--muted)] truncate">{it.weapon}</div>
            <div className="text-sm font-medium truncate">{it.name.replace(/^.*\|\s*/, "")}</div>
            <div className="flex justify-between items-center mt-1">
              <span
                className="text-[10px] uppercase tracking-wider"
                style={{ color: RARITY_COLOR[it.rarity] }}
              >
                {RARITY_LABEL_RU[it.rarity] ?? it.rarity}
              </span>
              <span className="text-orange-300 text-xs font-bold">{formatCoins(it.price)}</span>
            </div>
            {!selectable && (
              <button
                onClick={() => sell(it.id)}
                disabled={busyId === it.id}
                className="mt-2 w-full text-xs btn-ghost py-1"
              >
                {busyId === it.id ? "..." : `Продать за ${formatCoins(it.price)}`}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
