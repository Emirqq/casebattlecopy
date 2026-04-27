"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { InventoryGrid, InventoryEntry } from "@/components/InventoryGrid";
import { formatCoins } from "@/lib/format";
import { RARITY_COLOR, RARITY_LABEL_RU } from "@/lib/rarity";

type Props = {
  inventory: InventoryEntry[];
};

const REQUIRED = 10;

export function ContractsClient({ inventory }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<null | { name: string; price: number; rarity: string; imageUrl: string }>(null);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else if (next.size < REQUIRED) next.add(id);
    setSelected(next);
  }

  const total = inventory.filter((i) => selected.has(i.id)).reduce((s, i) => s + i.price, 0);
  const avg = selected.size > 0 ? Math.round(total / selected.size) : 0;

  async function submit() {
    if (selected.size !== REQUIRED) return;
    setBusy(true);
    try {
      const res = await fetch("/api/contract/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventoryIds: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Ошибка");
        setBusy(false);
        return;
      }
      setResult(data.item);
      setSelected(new Set());
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold uppercase">Контракты</h1>
      <p className="text-[color:var(--muted)] text-sm -mt-3">
        Сдай 10 предметов и получи новый — рандомный, с шансом получить более редкий, чем средняя стоимость.
      </p>

      <div className="card p-4 sticky top-16 z-10 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div className="text-sm">
          Выбрано: <span className="font-bold">{selected.size}/{REQUIRED}</span> · Сумма:{" "}
          <span className="text-orange-300 font-bold">{formatCoins(total)}</span> · Среднее:{" "}
          <span className="text-orange-300 font-bold">{formatCoins(avg)}</span>
        </div>
        <button onClick={submit} disabled={busy || selected.size !== REQUIRED} className="btn-primary">
          {busy ? "Подписываем…" : "Заключить контракт"}
        </button>
      </div>

      {result && (
        <div className="card p-4 flex items-center gap-4 border-emerald-400/30 bg-emerald-400/5">
          <div className="w-16 h-16 flex items-center justify-center bg-white/5 rounded">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={result.imageUrl} alt={result.name} className="max-h-full max-w-full object-contain" />
          </div>
          <div className="flex-1">
            <div className="text-xs uppercase" style={{ color: RARITY_COLOR[result.rarity] }}>
              {RARITY_LABEL_RU[result.rarity] ?? result.rarity}
            </div>
            <div className="font-semibold">{result.name}</div>
            <div className="text-orange-300 text-sm font-bold">{formatCoins(result.price)} монет</div>
          </div>
        </div>
      )}

      <InventoryGrid items={inventory} selectable selected={selected} onToggle={toggle} />
    </div>
  );
}
