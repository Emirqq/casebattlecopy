"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RARITY_COLOR, RARITY_LABEL_RU } from "@/lib/rarity";
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
const QUICK_MULTS = [2, 5, 10, 20] as const;
const QUICK_CHANCES = [0.25, 0.5, 0.75] as const;

export function UpgradeClient({ balance, inventory, allItems }: Props) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>([]);
  const [coinAmount, setCoinAmount] = useState<number>(0);
  const [targetItemId, setTargetItemId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [needle, setNeedle] = useState<number>(0); // 0 = top, clockwise positive
  const [result, setResult] = useState<null | { won: boolean; chance: number; targetName: string; targetImage: string; targetRarity: string }>(null);
  const [fast, setFast] = useState(false);

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

  // Animate needle when result arrives. Needle uses 0deg=top, clockwise positive.
  // Win arc is drawn from 0deg to chance*360deg clockwise, so a winning needle
  // angle must be in [margin, chance*360 - margin].
  useEffect(() => {
    if (!result) return;
    const winSpan = result.chance * 360;
    const margin = Math.min(4, winSpan * 0.05);
    const final = result.won
      ? margin + Math.random() * Math.max(1, winSpan - 2 * margin)
      : winSpan + margin + Math.random() * Math.max(1, 360 - winSpan - 2 * margin);
    if (fast) {
      setNeedle(final);
      return;
    }
    const target = 360 * 4 + final;
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
  }, [result, fast]);

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
      setResult({
        won: data.won,
        chance: data.chance,
        targetName: target.name,
        targetImage: target.imageUrl,
        targetRarity: target.rarity,
      });
      const settle = fast ? 700 : 2700;
      setTimeout(() => {
        router.refresh();
        setPicked([]);
        setCoinAmount(0);
        setBusy(false);
      }, settle);
    } catch {
      setBusy(false);
    }
  }

  const canFire = !busy && !!target && sourceValue > 0 && target.price > sourceValue;

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold uppercase bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
            Апгрейд
          </h1>
          <p className="text-[color:var(--muted)] text-sm">
            Отдай до {MAX_SOURCES} предметов и/или монет, чтобы получить шанс на более редкое оружие.
          </p>
        </div>
        <label className="inline-flex items-center gap-2 text-sm select-none cursor-pointer self-start md:self-auto">
          <span className={`relative inline-block w-10 h-6 rounded-full transition ${fast ? "bg-orange-500" : "bg-white/10"}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition ${fast ? "left-[18px]" : "left-0.5"}`} />
          </span>
          <input type="checkbox" className="sr-only" checked={fast} onChange={(e) => setFast(e.target.checked)} />
          <span className="text-white/80">Быстрая прокрутка</span>
        </label>
      </div>

      {/* Main dial card */}
      <div className="card p-5 relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-72 h-72 rounded-full bg-orange-400/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-72 h-72 rounded-full bg-purple-400/10 blur-3xl pointer-events-none" />

        <div className="grid lg:grid-cols-[1fr_auto_1fr] gap-6 items-center relative">
          {/* Source pile preview (left) */}
          <SidePreview
            label="Ваша ставка"
            valueLabel={formatCoins(sourceValue)}
            sub={`${sourceItems.length} предмет${pluralEnding(sourceItems.length)}${coinAmount > 0 ? ` + ${formatCoins(coinAmount)} монет` : ""}`}
            items={sourceItems}
            empty="Не выбрано"
            align="right"
          />

          {/* Dial (center) */}
          <div className="flex flex-col items-center gap-3">
            <ChanceDial
              chance={chance}
              needleAngle={needle}
              won={result?.won ?? null}
              targetImage={target?.imageUrl}
              targetRarityColor={target ? RARITY_COLOR[target.rarity] : undefined}
            />
            <div className="text-xs text-[color:var(--muted)] uppercase tracking-wider">Шанс победы</div>
            <div
              className={`text-3xl font-extrabold ${
                result?.won === true ? "text-emerald-300" : result?.won === false ? "text-red-300" : "text-orange-300"
              }`}
            >
              {(chance * 100).toFixed(2)}%
            </div>
            {result && (
              <div
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                  result.won
                    ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/30 flash-win"
                    : "bg-red-400/10 text-red-300 border border-red-400/30 flash-lose"
                }`}
              >
                {result.won ? `Победа! Получено: ${result.targetName}` : "Проигрыш. Ставка сгорела."}
              </div>
            )}
          </div>

          {/* Target preview (right) */}
          <SidePreview
            label="Цель апгрейда"
            valueLabel={target ? formatCoins(target.price) : "—"}
            sub={target ? RARITY_LABEL_RU[target.rarity] ?? target.rarity : "Не выбрана"}
            empty="Выберите ниже"
            align="left"
            target={target}
          />
        </div>

        {/* Coin slider + button */}
        <div className="mt-6 grid lg:grid-cols-[1fr_auto] gap-3 items-center">
          <div>
            <div className="flex items-center justify-between text-xs text-[color:var(--muted)] mb-1">
              <span>Добавить монеты к ставке</span>
              <span className="text-orange-300 font-semibold">{formatCoins(coinAmount)} / {formatCoins(balance)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={balance}
              step={10}
              value={Math.min(coinAmount, balance)}
              onChange={(e) => setCoinAmount(Number(e.target.value))}
              className="w-full range-orange"
            />
          </div>
          <button onClick={attempt} disabled={!canFire} className="btn-primary px-8 uppercase tracking-wider">
            {busy ? (fast ? "Считаем…" : "Крутим…") : "Прокачать"}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 justify-center text-xs">
          {QUICK_MULTS.map((m) => (
            <button key={m} onClick={() => pickByMultiplier(m)} className="btn-ghost !px-3 !py-1.5 text-xs">×{m}</button>
          ))}
          {QUICK_CHANCES.map((p) => (
            <button key={p} onClick={() => pickByChance(p)} className="btn-ghost !px-3 !py-1.5 text-xs">{Math.round(p * 100)}%</button>
          ))}
          <button onClick={pickShuffleTarget} className="btn-ghost !px-3 !py-1.5 text-xs" title="Случайная цель">⇄ Случайная</button>
          {(picked.length > 0 || coinAmount > 0) && (
            <button onClick={clearSources} className="btn-ghost !px-3 !py-1.5 text-xs">Очистить</button>
          )}
        </div>

        {sourceValue > 0 && target && target.price <= sourceValue && (
          <div className="text-xs text-red-400 text-center mt-2">Цель должна быть дороже ставки.</div>
        )}
      </div>

      {/* Slots row (compact source slots strip) */}
      <div className="card p-3">
        <div className="panel-title mb-2">Слоты ставки ({sourceItems.length}/{MAX_SOURCES})</div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {Array.from({ length: MAX_SOURCES }).map((_, i) => {
            const it = sourceItems[i];
            if (!it) {
              return (
                <div key={i} className="aspect-square rounded-lg border border-dashed border-white/10 flex items-center justify-center text-white/20 text-xs">
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
      </div>

      {/* Inventory + catalog */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-3">
          <div className="panel-title mb-2 flex items-center justify-between">
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

        <div className="card p-3">
          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <span className="panel-title">Выберите цель</span>
            <div className="flex items-center gap-1 text-xs">
              <input
                type="number"
                placeholder="от"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                className="w-16 input-base !px-2 !py-1 text-xs"
              />
              <span>—</span>
              <input
                type="number"
                placeholder="до"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                className="w-20 input-base !px-2 !py-1 text-xs"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск…"
                className="input-base !px-2 !py-1 text-xs w-32"
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

function pluralEnding(n: number): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return "ов";
  if (b > 1 && b < 5) return "а";
  if (b === 1) return "";
  return "ов";
}

function SidePreview({
  label,
  valueLabel,
  sub,
  items,
  target,
  empty,
  align,
}: {
  label: string;
  valueLabel: string;
  sub: string;
  items?: Item[];
  target?: Item | null;
  empty: string;
  align: "left" | "right";
}) {
  return (
    <div className={`flex flex-col gap-2 ${align === "right" ? "items-end text-right" : "items-start text-left"}`}>
      <div className="panel-title">{label}</div>
      <div className="text-orange-300 text-xl font-extrabold">{valueLabel}</div>
      <div className="text-xs text-[color:var(--muted)]">{sub}</div>
      {target ? (
        <div
          className="rounded-lg border p-3 flex flex-col items-center bg-white/[0.02] w-44"
          style={{ borderColor: `${RARITY_COLOR[target.rarity]}88`, boxShadow: `0 0 30px -8px ${RARITY_COLOR[target.rarity]}` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={target.imageUrl} alt={target.name} className="max-h-24 object-contain" />
          <div className="text-xs font-semibold text-center mt-1 truncate w-full">{target.name}</div>
        </div>
      ) : items && items.length > 0 ? (
        <div className={`flex gap-1 flex-wrap ${align === "right" ? "justify-end" : "justify-start"}`}>
          {items.slice(0, 6).map((it) => (
            <div
              key={it.id}
              className="w-12 h-12 rounded border bg-black/30 flex items-center justify-center"
              style={{ borderColor: `${RARITY_COLOR[it.rarity]}88` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.imageUrl} alt={it.name} className="max-w-[80%] max-h-[80%] object-contain" />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-white/30 italic">{empty}</div>
      )}
    </div>
  );
}

function ChanceDial({
  chance,
  needleAngle,
  won,
  targetImage,
  targetRarityColor,
}: {
  chance: number;
  needleAngle: number;
  won: boolean | null;
  targetImage?: string;
  targetRarityColor?: string;
}) {
  const size = 280;
  const r = 116;
  const c = size / 2;
  const stroke = 18;

  // Build win arc path: from top (0deg) clockwise to chance*360 deg.
  const winSpan = chance * 360;
  const arcPath = describeArc(c, c, r, 0, winSpan);
  const fullCircle = 2 * Math.PI * r;
  const winArcLen = fullCircle * chance;

  const ringColor = won === true ? "#36d399" : won === false ? "#ff4d4d" : "#36d399";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="block">
        <defs>
          <linearGradient id="winGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#36d399" />
            <stop offset="100%" stopColor="#a3e635" />
          </linearGradient>
          <linearGradient id="loseGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ff4d4d" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>
          <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Loss ring (full background) */}
        <circle cx={c} cy={c} r={r} fill="none" stroke="url(#loseGrad)" strokeWidth={stroke} opacity={0.38} />

        {/* Win arc */}
        {winSpan > 0.5 && (
          <path
            d={arcPath}
            fill="none"
            stroke="url(#winGrad)"
            strokeWidth={stroke}
            strokeLinecap="round"
            filter="url(#glow)"
            style={{
              strokeDasharray: `${winArcLen} ${fullCircle}`,
            }}
          />
        )}

        {/* Tick marks */}
        {[0, 0.25, 0.5, 0.75].map((p) => {
          const angle = p * 360 - 90; // -90 because 0deg here = top
          const rad = (angle * Math.PI) / 180;
          const x1 = c + Math.cos(rad) * (r - stroke / 2 - 3);
          const y1 = c + Math.sin(rad) * (r - stroke / 2 - 3);
          const x2 = c + Math.cos(rad) * (r + stroke / 2 + 3);
          const y2 = c + Math.sin(rad) * (r + stroke / 2 + 3);
          return <line key={p} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} />;
        })}

        {/* Needle */}
        <g transform={`translate(${c},${c}) rotate(${needleAngle})`}>
          <line x1={0} y1={0} x2={0} y2={-(r + 8)} stroke="#fff" strokeWidth={3} strokeLinecap="round" filter="url(#glow)" />
          <circle cx={0} cy={-(r + 6)} r={5} fill="#fff" />
        </g>

        {/* Hub */}
        <circle cx={c} cy={c} r={50} fill="var(--background-card)" stroke={ringColor} strokeWidth={2} opacity={0.95} />
      </svg>

      {/* Inner content (target + chance) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="flex flex-col items-center gap-1" style={{ width: 96, height: 96 }}>
          {targetImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={targetImage}
              alt=""
              className="max-w-[80%] max-h-[80%] object-contain drop-shadow-[0_0_10px_rgba(255,180,71,0.4)]"
              style={{ filter: targetRarityColor ? `drop-shadow(0 0 6px ${targetRarityColor}aa)` : undefined }}
            />
          ) : (
            <div className="text-white/30 text-3xl">?</div>
          )}
        </div>
      </div>
    </div>
  );
}

// Build SVG path for an arc starting at top (0deg), going clockwise.
function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const start = polarToCart(cx, cy, r, startDeg);
  const end = polarToCart(cx, cy, r, endDeg);
  const large = endDeg - startDeg <= 180 ? 0 : 1;
  return [
    "M", start.x, start.y,
    "A", r, r, 0, large, 1, end.x, end.y,
  ].join(" ");
}
function polarToCart(cx: number, cy: number, r: number, deg: number) {
  // 0deg = top, clockwise positive (so 90deg = right, 180 = bottom)
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
