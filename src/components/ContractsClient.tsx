"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { InventoryEntry } from "@/components/InventoryGrid";
import { formatCoins } from "@/lib/format";
import { RARITY_COLOR, RARITY_LABEL_RU } from "@/lib/rarity";

type Item = {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  rarity: string;
  weapon: string | null;
};

type Props = {
  inventory: InventoryEntry[];
  allItems: Item[];
};

const MIN = 3;
const MAX = 10;

export function ContractsClient({ inventory, allItems }: Props) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<null | { name: string; price: number; rarity: string; imageUrl: string }>(null);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<"random" | "specific">("random");
  const [targetItemId, setTargetItemId] = useState<string | null>(null);
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");
  const [search, setSearch] = useState("");

  function toggle(id: string) {
    setPicked((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= MAX) return cur;
      return [...cur, id];
    });
  }
  function clear() {
    setPicked([]);
  }

  const pickedItems = useMemo(
    () => picked.map((id) => inventory.find((i) => i.id === id)).filter(Boolean) as InventoryEntry[],
    [picked, inventory]
  );
  const total = pickedItems.reduce((s, i) => s + i.price, 0);
  const avg = picked.length > 0 ? Math.round(total / picked.length) : 0;
  const target = mode === "specific" ? allItems.find((i) => i.id === targetItemId) ?? null : null;
  const targetChance =
    target && picked.length > 0 ? Math.min(0.95, Math.max(0, (avg * 0.9) / target.price)) : null;

  const filtered = useMemo(() => {
    const min = priceMin === "" ? 0 : Number(priceMin);
    const max = priceMax === "" ? Infinity : Number(priceMax);
    return allItems
      .filter((i) => i.price >= min && i.price <= max)
      .filter((i) => !search || i.name.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 80);
  }, [allItems, search, priceMin, priceMax]);

  async function submit() {
    if (busy) return;
    if (picked.length < MIN || picked.length > MAX) {
      setError(`Выбери от ${MIN} до ${MAX} предметов`);
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const body: Record<string, unknown> = {
        inventoryIds: picked,
      };
      if (mode === "specific" && targetItemId) body.targetItemId = targetItemId;
      if (priceMin !== "") body.priceMin = Number(priceMin);
      if (priceMax !== "") body.priceMax = Number(priceMax);

      const res = await fetch("/api/contract/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Ошибка");
        setBusy(false);
        return;
      }
      setResult(data.item);
      setPicked([]);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const slots: (InventoryEntry | null)[] = Array.from({ length: MAX }, (_, i) => pickedItems[i] ?? null);
  const remainingToMin = Math.max(0, MIN - picked.length);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold uppercase">Контракты</h1>
        <p className="text-[color:var(--muted)] text-sm">
          Сдай от {MIN} до {MAX} предметов и получи новый — рандомный или конкретный с шансом.
        </p>
      </div>

      {/* Top slot strip */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="text-sm">
            Выбрано: <span className="font-bold">{picked.length}/{MAX}</span> ·
            Сумма: <span className="text-orange-300 font-bold">{formatCoins(total)}</span> ·
            Среднее: <span className="text-orange-300 font-bold">{formatCoins(avg)}</span>
            {remainingToMin > 0 && (
              <span className="ml-3 text-orange-300/90 font-semibold">
                Положить ещё минимум {remainingToMin} {plural(remainingToMin, ["предмет", "предмета", "предметов"])}
              </span>
            )}
          </div>
          {picked.length > 0 && (
            <button onClick={clear} className="btn-ghost text-xs">очистить</button>
          )}
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {slots.map((s, i) => (
            <div
              key={i}
              onClick={s ? () => toggle(s.id) : undefined}
              className={`relative aspect-square rounded-lg border flex items-center justify-center p-1 ${
                s ? "border-orange-400/40 bg-white/5 cursor-pointer hover:bg-white/10" : "border-dashed border-white/10 bg-black/20 text-white/20 text-xs"
              }`}
              style={s ? { borderColor: `${RARITY_COLOR[s.rarity]}88` } : undefined}
            >
              {s ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.imageUrl} alt={s.name} className="max-h-[70%] max-w-full object-contain" />
                  <span className="absolute bottom-0.5 left-1 right-1 truncate text-[10px] text-orange-300 font-bold text-center">
                    {formatCoins(s.price)}
                  </span>
                </>
              ) : (
                i + 1
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom row: my items + reward picker */}
      <div className="grid lg:grid-cols-[1fr_minmax(320px,420px)] gap-4">
        {/* My items */}
        <div className="card p-3">
          <div className="panel-title mb-2 flex items-center justify-between">
            <span>Мои предметы</span>
            <span>{inventory.length} шт.</span>
          </div>
          {inventory.length === 0 ? (
            <div className="text-center text-[color:var(--muted)] py-12">
              <div className="mb-3">У вас нет предметов</div>
              <a href="/" className="btn-primary inline-flex">Открыть кейс</a>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 max-h-[420px] overflow-auto scrollbar-thin">
              {inventory.map((it) => {
                const isSelected = picked.includes(it.id);
                return (
                  <button
                    key={it.id}
                    onClick={() => toggle(it.id)}
                    className={`text-left card p-2 transition ${isSelected ? "ring-2 ring-orange-400" : ""}`}
                    style={{ borderColor: `${RARITY_COLOR[it.rarity]}55` }}
                  >
                    <div
                      className="rarity-bar mb-1"
                      style={{ background: RARITY_COLOR[it.rarity] ?? "#888" }}
                    />
                    <div className="aspect-[4/3] flex items-center justify-center bg-white/[0.02] rounded">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={it.imageUrl} alt={it.name} className="max-h-full max-w-full object-contain" loading="lazy" />
                    </div>
                    <div className="text-[10px] truncate mt-1">{it.name.split("|")[1]?.trim() ?? it.name}</div>
                    <div className="flex justify-between items-center mt-0.5">
                      <span className="text-[9px] uppercase tracking-wider" style={{ color: RARITY_COLOR[it.rarity] }}>
                        {RARITY_LABEL_RU[it.rarity] ?? it.rarity}
                      </span>
                      <span className="text-orange-300 text-xs font-bold">{formatCoins(it.price)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Reward picker */}
        <div className="card p-4 flex flex-col gap-3">
          <div className="panel-title">Вы получите предмет</div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-[color:var(--muted)]">Цель:</span>
            <button
              onClick={() => setMode("random")}
              className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                mode === "random" ? "bg-orange-500/20 border-orange-400 text-orange-200" : "bg-white/5 border-white/10 hover:bg-white/10"
              }`}
            >
              ⇄ Случайная
            </button>
            <button
              onClick={() => setMode("specific")}
              className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                mode === "specific" ? "bg-orange-500/20 border-orange-400 text-orange-200" : "bg-white/5 border-white/10 hover:bg-white/10"
              }`}
            >
              ◎ Конкретная
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[color:var(--muted)]">от</span>
            <input
              type="number"
              placeholder="0"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              className="input-base w-20 px-2 py-1"
            />
            <span className="text-xs text-[color:var(--muted)]">до</span>
            <input
              type="number"
              placeholder="∞"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              className="input-base w-24 px-2 py-1"
            />
            {mode === "specific" && (
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск…"
                className="input-base flex-1 min-w-32 px-2 py-1"
              />
            )}
          </div>

          {mode === "random" ? (
            <div className="rounded-lg border border-dashed border-white/10 p-4 text-center text-sm text-[color:var(--muted)]">
              <div className="text-base text-white mb-1">Случайный предмет</div>
              <div>
                Цена в диапазоне <span className="text-orange-300 font-semibold">{priceMin || "0"}</span>{" "}
                — <span className="text-orange-300 font-semibold">{priceMax || "∞"}</span>
              </div>
              <div className="mt-2 text-xs">Если не задать диапазон, выпадет предмет рядом со средней ценой ставки × 0.9.</div>
            </div>
          ) : (
            <div className="space-y-2">
              {target ? (
                <div
                  className="rounded-lg border p-3 flex items-center gap-3"
                  style={{ borderColor: `${RARITY_COLOR[target.rarity]}88` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={target.imageUrl} alt={target.name} className="w-16 h-16 object-contain" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{target.name}</div>
                    <div className="text-orange-300 font-bold">{formatCoins(target.price)} монет</div>
                    {targetChance !== null && (
                      <div className="text-xs text-[color:var(--muted)]">
                        Шанс: <span className="text-orange-300 font-bold">{(targetChance * 100).toFixed(2)}%</span>
                      </div>
                    )}
                  </div>
                  <button onClick={() => setTargetItemId(null)} className="btn-ghost !text-xs !px-2 !py-1">Сброс</button>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-white/10 p-3 text-center text-sm text-[color:var(--muted)]">
                  Выберите предмет ниже
                </div>
              )}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-56 overflow-auto scrollbar-thin">
                {filtered.length === 0 && (
                  <div className="col-span-full text-sm text-[color:var(--muted)] p-4 text-center">Ничего не найдено</div>
                )}
                {filtered.map((it) => (
                  <button
                    key={it.id}
                    onClick={() => setTargetItemId(it.id)}
                    className={`text-left card p-2 transition ${targetItemId === it.id ? "ring-2 ring-orange-400" : ""}`}
                    style={{ borderColor: `${RARITY_COLOR[it.rarity]}55` }}
                  >
                    <div className="aspect-square flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={it.imageUrl} alt={it.name} className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="text-[10px] truncate">{it.name}</div>
                    <div className="text-orange-300 text-[11px] font-bold">{formatCoins(it.price)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={submit}
            disabled={busy || picked.length < MIN || (mode === "specific" && !targetItemId)}
            className="btn-primary w-full uppercase tracking-wider mt-1"
          >
            {busy ? "Подписываем…" : picked.length < MIN ? `Положить ещё минимум ${remainingToMin}` : "Подписать контракт"}
          </button>
          {error && <div className="text-sm text-red-400">{error}</div>}
          {result && (
            <div className="rounded-lg p-3 border border-emerald-400/30 bg-emerald-400/5 flex items-center gap-3 flash-win drop-reveal">
              <div
                className="w-14 h-14 flex items-center justify-center bg-white/5 rounded border"
                style={{ borderColor: `${RARITY_COLOR[result.rarity]}88` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={result.imageUrl} alt={result.name} className="max-h-full max-w-full object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase" style={{ color: RARITY_COLOR[result.rarity] }}>
                  {RARITY_LABEL_RU[result.rarity] ?? result.rarity}
                </div>
                <div className="font-semibold truncate">{result.name}</div>
                <div className="text-orange-300 text-sm font-bold">{formatCoins(result.price)} монет</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function plural(n: number, forms: [string, string, string]) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}
