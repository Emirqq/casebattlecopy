"use client";

import { useEffect, useMemo, useState } from "react";
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

const HOUSE_EDGE = 0.92;
const MAX_SOURCES = 6;
const QUICK_MULTS = [2, 5, 10] as const;
const QUICK_CHANCES = [0.5, 0.75] as const;

export function UpgradeClient({ balance, inventory, allItems }: Props) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>([]); // inventory ids in slot order
  const [coinAmount, setCoinAmount] = useState<number>(0);
  const [targetItemId, setTargetItemId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [needle, setNeedle] = useState<number>(0); // angle in degrees [0..360]
  const [result, setResult] = useState<null | { won: boolean; chance: number; targetName: string }>(null);

  const sourceItems = useMemo(
    () => picked.map((id) => inventory.find((i) => i.id === id)).filter(Boolean) as InventoryEntry[],
    [picked, inventory]
  );

  const itemsValue = sourceItems.reduce((s, i) => s + i.price, 0);
  const sourceValue = itemsValue + Math.max(0, coinAmount);

  const target = allItems.find((i) => i.id === targetItemId) ?? null;

  const chance = useMemo(() => {
    if (!target || sourceValue <= 0) return 0;
    if (target.price <= sourceValue) return 0.95;
    return Math.min(0.95, Math.max(0, (sourceValue / target.price) * HOUSE_EDGE));
  }, [target, sourceValue]);

  const filteredTargets = useMemo(() => {
    const min = priceMin === "" ? 0 : Number(priceMin);
    const max = priceMax === "" ? Infinity : Number(priceMax);
    return allItems
      .filter((i) => i.price > sourceValue)
      .filter((i) => i.price >= min && i.price <= max)
      .filter((i) => !search || i.name.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 80);
  }, [allItems, sourceValue, search, priceMin, priceMax]);

  function toggleSource(invId: string) {
    setPicked((cur) => {
      if (cur.includes(invId)) return cur.filter((x) => x !== invId);
      if (cur.length >= MAX_SOURCES) return cur;
      return [...cur, invId];
    });
  }

  function clearSources() {
    setPicked([]);
    setCoinAmount(0);
  }

  function pickByMultiplier(mult: number) {
    if (sourceValue <= 0) return;
    const targetPrice = sourceValue * mult;
    const candidate = [...allItems]
      .filter((i) => i.price > sourceValue)
      .sort((a, b) => Math.abs(a.price - targetPrice) - Math.abs(b.price - targetPrice))[0];
    if (candidate) setTargetItemId(candidate.id);
  }

  function pickByChance(p: number) {
    if (sourceValue <= 0) return;
    // chance = (source / target) * 0.92  =>  target = source * 0.92 / p
    const targetPrice = (sourceValue * HOUSE_EDGE) / p;
    const candidate = [...allItems]
      .filter((i) => i.price > sourceValue)
      .sort((a, b) => Math.abs(a.price - targetPrice) - Math.abs(b.price - targetPrice))[0];
    if (candidate) setTargetItemId(candidate.id);
  }

  function pickShuffleTarget() {
    if (sourceValue <= 0) return;
    const pool = allItems.filter((i) => i.price > sourceValue && i.price < sourceValue * 20);
    if (!pool.length) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setTargetItemId(pick.id);
  }

  // Animate needle when result arrives.
  useEffect(() => {
    if (!result) return;
    const winSpan = result.chance * 360;
    const final = result.won
      ? Math.random() * Math.max(1, winSpan - 4) + 2
      : winSpan + Math.random() * Math.max(1, 360 - winSpan - 4) + 2;
    const target = 360 * 4 + final; // 4 full spins + final position
    const start = performance.now();
    const duration = 2400;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setNeedle(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [result]);

  async function attempt() {
    if (busy || !target || sourceValue <= 0 || target.price <= sourceValue) return;
    setBusy(true);
    setResult(null);
    setNeedle(0);
    try {
      const res = await fetch("/api/upgrade/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceInventoryIds: picked,
          balanceAmount: Math.max(0, coinAmount),
          targetItemId: target.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Ошибка");
        setBusy(false);
        return;
      }
      setResult({ won: data.won, chance: data.chance, targetName: target.name });
      setTimeout(() => {
        router.refresh();
        setPicked([]);
        setCoinAmount(0);
        setBusy(false);
      }, 2700);
    } catch {
      setBusy(false);
    }
  }

  const canFire = !busy && !!target && sourceValue > 0 && target.price > sourceValue;

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-1">
        <h1 className="text-2xl font-bold uppercase tracking-wider">Модернизация оружия 2.0</h1>
        <p className="text-[color:var(--muted)] text-sm">
          Отдай до {MAX_SOURCES} предметов и/или монет, чтобы получить шанс на более редкое оружие.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_minmax(280px,360px)_1fr] gap-4">
        {/* Source slots */}
        <div className="card p-3">
          <div className="text-xs uppercase tracking-wider text-[color:var(--muted)] mb-2">
            Выберите до {MAX_SOURCES} предметов на апгрейд
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: MAX_SOURCES }).map((_, i) => {
              const it = sourceItems[i];
              if (!it) {
                return (
                  <div
                    key={i}
                    className="aspect-square rounded-lg border border-dashed border-white/10 flex items-center justify-center text-white/20 text-xs"
                  >
                    {i + 1}
                  </div>
                );
              }
              return (
                <button
                  key={i}
                  onClick={() => toggleSource(it.id)}
                  className="relative aspect-square rounded-lg border bg-black/30 p-1 flex flex-col items-center justify-center hover:border-orange-400/50"
                  style={{ borderColor: `${RARITY_COLOR[it.rarity]}88` }}
                  title="Убрать"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.imageUrl} alt={it.name} className="max-h-[70%] max-w-full object-contain" />
                  <div className="text-[10px] truncate w-full text-center">{it.name.split("|")[1]?.trim() ?? it.name}</div>
                  <div className="text-[10px] text-orange-300 font-bold">{formatCoins(it.price)}</div>
                </button>
              );
            })}
          </div>
          <div className="mt-3 text-xs text-[color:var(--muted)] flex justify-between">
            <span>Сумма предметов: <span className="text-orange-300 font-semibold">{formatCoins(itemsValue)}</span></span>
            {(sourceItems.length > 0 || coinAmount > 0) && (
              <button onClick={clearSources} className="hover:text-white">очистить</button>
            )}
          </div>
        </div>

        {/* Center: dial + actions */}
        <div className="card p-4 flex flex-col items-center gap-3">
          <ChanceDial chance={chance} needleAngle={needle} won={result?.won ?? null} />
          <div className="w-full">
            <div className="flex items-center justify-between text-xs text-[color:var(--muted)] mb-1">
              <span>Добавить монеты</span>
              <span className="text-orange-300 font-semibold">{formatCoins(coinAmount)} / {formatCoins(balance)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={balance}
              step={10}
              value={Math.min(coinAmount, balance)}
              onChange={(e) => setCoinAmount(Number(e.target.value))}
              className="w-full accent-orange-500"
            />
          </div>
          <button onClick={attempt} disabled={!canFire} className="btn-primary w-full uppercase tracking-wider">
            {busy ? "Крутим…" : "Прокачать"}
          </button>
          <div className="flex gap-1 flex-wrap justify-center">
            {QUICK_MULTS.map((m) => (
              <button key={m} onClick={() => pickByMultiplier(m)} className="btn-ghost !px-2 !py-1 text-xs">
                ×{m}
              </button>
            ))}
            {QUICK_CHANCES.map((p) => (
              <button key={p} onClick={() => pickByChance(p)} className="btn-ghost !px-2 !py-1 text-xs">
                {Math.round(p * 100)}%
              </button>
            ))}
            <button onClick={pickShuffleTarget} className="btn-ghost !px-2 !py-1 text-xs" title="Случайная цель">
              ⇄
            </button>
          </div>
          {sourceValue > 0 && target && target.price <= sourceValue && (
            <div className="text-xs text-red-400">Цель должна быть дороже ставки.</div>
          )}
          {result && (
            <div
              className={`w-full rounded-lg p-2 text-center text-sm font-semibold ${
                result.won
                  ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/30"
                  : "bg-red-400/10 text-red-300 border border-red-400/30"
              }`}
            >
              {result.won ? `Победа! Получено: ${result.targetName}` : "Проигрыш. Ставка сгорела."}
            </div>
          )}
        </div>

        {/* Target preview */}
        <div className="card p-3 flex flex-col">
          <div className="text-xs uppercase tracking-wider text-[color:var(--muted)] mb-2">
            Выберите оружие, которое хотите получить
          </div>
          {target ? (
            <div
              className="rounded-lg border p-3 flex flex-col items-center gap-2 grow"
              style={{ borderColor: `${RARITY_COLOR[target.rarity]}88` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={target.imageUrl} alt={target.name} className="max-h-32 object-contain" />
              <div className="text-sm font-semibold text-center">{target.name}</div>
              <div className="text-orange-300 font-bold">{formatCoins(target.price)} монет</div>
              <div className="text-xs text-[color:var(--muted)]">
                Шанс: <span className="text-orange-300 font-bold">{(chance * 100).toFixed(2)}%</span>
              </div>
              <button onClick={() => setTargetItemId(null)} className="btn-ghost !text-xs !px-2 !py-1 mt-auto">
                Сбросить
              </button>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-white/10 grow flex items-center justify-center text-white/30 text-sm p-6 text-center">
              Цель не выбрана. Выберите ниже из каталога.
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* My inventory */}
        <div className="card p-3">
          <div className="text-xs uppercase tracking-wider text-[color:var(--muted)] mb-2 flex items-center justify-between">
            <span>Мои предметы</span>
            <span>{inventory.length} шт.</span>
          </div>
          {inventory.length === 0 ? (
            <div className="text-sm text-[color:var(--muted)] p-6 text-center">
              Чтобы начать апгрейд — открой кейс или используй монеты.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 overflow-auto scrollbar-thin">
              {inventory.map((it) => {
                const selected = picked.includes(it.id);
                return (
                  <button
                    key={it.id}
                    onClick={() => toggleSource(it.id)}
                    className={`text-left card p-2 transition ${selected ? "ring-2 ring-orange-400" : ""}`}
                    style={{ borderColor: `${RARITY_COLOR[it.rarity]}55` }}
                  >
                    <div className="aspect-square flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={it.imageUrl} alt={it.name} className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="text-[11px] truncate">{it.name}</div>
                    <div className="text-orange-300 text-xs font-bold">{formatCoins(it.price)}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Catalog */}
        <div className="card p-3">
          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <span className="text-xs uppercase tracking-wider text-[color:var(--muted)]">Выберите предмет</span>
            <div className="flex items-center gap-1 text-xs">
              <input
                type="number"
                placeholder="от"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                className="w-16 bg-white/5 border border-white/10 rounded px-1 py-0.5"
              />
              <span>—</span>
              <input
                type="number"
                placeholder="до"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                className="w-20 bg-white/5 border border-white/10 rounded px-1 py-0.5"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск…"
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm w-32"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 overflow-auto scrollbar-thin">
            {filteredTargets.length === 0 && (
              <div className="col-span-full text-sm text-[color:var(--muted)] p-4 text-center">
                {sourceValue <= 0 ? "Сначала выбери ставку." : "Нет подходящих целей."}
              </div>
            )}
            {filteredTargets.map((it) => (
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
                <div className="text-[11px] truncate">{it.name}</div>
                <div className="text-orange-300 text-xs font-bold">{formatCoins(it.price)}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChanceDial({ chance, needleAngle, won }: { chance: number; needleAngle: number; won: boolean | null }) {
  const size = 220;
  const r = 92;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const winLen = circ * chance;
  const loseLen = circ - winLen;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Loss arc (full circle background) */}
        <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,80,80,0.35)" strokeWidth={14} />
        {/* Win arc (top of background) */}
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke="rgba(80,220,140,0.85)"
          strokeWidth={14}
          strokeDasharray={`${winLen} ${loseLen}`}
          strokeLinecap="butt"
        />
        {/* Tick marks at 0/25/50/75 */}
        {[0, 0.25, 0.5, 0.75].map((p) => {
          const ang = p * 2 * Math.PI;
          const x1 = c + Math.cos(ang) * (r - 10);
          const y1 = c + Math.sin(ang) * (r - 10);
          const x2 = c + Math.cos(ang) * (r + 10);
          const y2 = c + Math.sin(ang) * (r + 10);
          return <line key={p} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} />;
        })}
      </svg>
      {/* Tick labels (not rotated) */}
      <div className="absolute inset-0 pointer-events-none text-[10px] text-white/60">
        <span className="absolute" style={{ top: c - r - 18, left: c - 10 }}>0%</span>
        <span className="absolute" style={{ top: c - 6, left: c + r + 6 }}>25%</span>
        <span className="absolute" style={{ top: c + r + 4, left: c - 12 }}>50%</span>
        <span className="absolute" style={{ top: c - 6, left: c - r - 32 }}>75%</span>
      </div>
      {/* Needle */}
      <div
        className="absolute"
        style={{
          width: 2,
          height: r + 6,
          background: "linear-gradient(180deg, transparent, #fff)",
          left: c - 1,
          top: c - r - 6,
          transformOrigin: `1px ${r + 6}px`,
          transform: `rotate(${needleAngle - 90}deg)`,
          transition: needleAngle === 0 ? "transform 0s" : undefined,
        }}
      />
      <div
        className="absolute rounded-full bg-[var(--background-card)] border border-white/10 flex items-center justify-center"
        style={{ width: 90, height: 90, left: c - 45, top: c - 45 }}
      >
        <div className="text-center">
          <div className="text-xs text-[color:var(--muted)]">шанс</div>
          <div
            className={`text-2xl font-bold ${
              won === true ? "text-emerald-300" : won === false ? "text-red-300" : "text-orange-300"
            }`}
          >
            {(chance * 100).toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
}
