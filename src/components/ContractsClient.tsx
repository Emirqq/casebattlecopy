"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { InventoryEntry } from "@/components/InventoryGrid";
import { formatCoins } from "@/lib/format";
import { RARITY_COLOR, RARITY_LABEL_RU } from "@/lib/rarity";

type Props = { inventory: InventoryEntry[] };

const MIN = 3;
const MAX = 10;
const HOUSE_EDGE = 0.9;
const MIN_FACTOR = 0.5;
const MAX_FACTOR = 1.5;

export function ContractsClient({ inventory }: Props) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<null | {
    name: string;
    price: number;
    rarity: string;
    imageUrl: string;
    range: { min: number; max: number; expected: number };
  }>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSignature, setHasSignature] = useState(false);

  const pickedItems = useMemo(
    () => picked.map((id) => inventory.find((i) => i.id === id)).filter(Boolean) as InventoryEntry[],
    [picked, inventory]
  );
  const total = pickedItems.reduce((s, i) => s + i.price, 0);
  const avg = picked.length > 0 ? total / picked.length : 0;
  const expected = avg > 0 ? Math.max(10, Math.round(avg * HOUSE_EDGE)) : 0;
  const minP = expected > 0 ? Math.max(10, Math.floor(expected * MIN_FACTOR)) : 0;
  const maxP = expected > 0 ? Math.max(minP + 10, Math.ceil(expected * MAX_FACTOR)) : 0;

  function toggle(id: string) {
    setPicked((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= MAX) return cur;
      return [...cur, id];
    });
  }
  function clear() {
    setPicked([]);
    setResult(null);
    setError(null);
  }

  async function submit() {
    if (busy) return;
    if (picked.length < MIN || picked.length > MAX) {
      setError(`Выбери от ${MIN} до ${MAX} предметов`);
      return;
    }
    if (!hasSignature) {
      setError("Поставьте подпись в окошке справа");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/contract/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventoryIds: picked }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Ошибка");
        setBusy(false);
        return;
      }
      setResult({ ...data.item, range: data.range });
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
        <h1 className="text-3xl md:text-4xl font-extrabold uppercase bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
          Контракты
        </h1>
        <p className="text-[color:var(--muted)] text-sm">
          Сдай от {MIN} до {MAX} предметов, поставь подпись и получи случайный скин в указанном диапазоне.
        </p>
      </div>

      {/* Top: 10-slot strip + summary */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 text-sm">
          <div>
            Выбрано: <span className="font-bold">{picked.length}/{MAX}</span> ·
            Сумма: <span className="text-orange-300 font-bold">{formatCoins(total)}</span> ·
            Средняя: <span className="text-orange-300 font-bold">{formatCoins(Math.round(avg))}</span>
            {remainingToMin > 0 && (
              <span className="ml-3 text-orange-300/90 font-semibold">
                Положить ещё минимум {remainingToMin}
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
                s
                  ? "bg-white/5 cursor-pointer hover:bg-white/10"
                  : i < MIN
                  ? "border-dashed border-orange-400/30 bg-orange-500/[0.04] text-orange-300/40 text-xs"
                  : "border-dashed border-white/10 bg-black/20 text-white/20 text-xs"
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

        {/* Predicted price range */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="panel-title">Возможный диапазон цены</div>
          {picked.length >= MIN ? (
            <div className="flex items-baseline gap-2">
              <span className="text-orange-300 font-extrabold text-2xl">{formatCoins(minP)}</span>
              <span className="text-[color:var(--muted)]">—</span>
              <span className="text-orange-300 font-extrabold text-2xl">{formatCoins(maxP)}</span>
              <span className="text-xs text-[color:var(--muted)]">(ожидание ≈ {formatCoins(expected)})</span>
            </div>
          ) : (
            <div className="text-sm text-white/40">Положи минимум {MIN} предмета, чтобы увидеть диапазон.</div>
          )}
        </div>
      </div>

      {/* Bottom: my items + signature */}
      <div className="grid lg:grid-cols-[1fr_minmax(320px,420px)] gap-4">
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
                    <div className="rarity-bar mb-1" style={{ background: RARITY_COLOR[it.rarity] ?? "#888" }} />
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

        <div className="card p-4 flex flex-col gap-3">
          <div className="panel-title">Подпись</div>
          <p className="text-xs text-[color:var(--muted)]">
            Поставьте свою подпись (нарисуйте мышью или пальцем). Без подписи контракт не вступит в силу.
          </p>
          <SignaturePad onChange={setHasSignature} disabled={busy} />

          <button
            onClick={submit}
            disabled={busy || picked.length < MIN || !hasSignature}
            className="btn-primary w-full uppercase tracking-wider"
          >
            {busy
              ? "Подписываем…"
              : picked.length < MIN
              ? `Положить ещё минимум ${remainingToMin}`
              : !hasSignature
              ? "Поставьте подпись"
              : "Подписать контракт"}
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
                <div className="text-[10px] text-[color:var(--muted)]">
                  Диапазон был {formatCoins(result.range.min)} — {formatCoins(result.range.max)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SignaturePad({ onChange, disabled }: { onChange: (has: boolean) => void; disabled: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);
  }, []);

  function getPos(e: React.PointerEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent) {
    if (disabled) return;
    drawingRef.current = true;
    lastRef.current = getPos(e);
    (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
  }

  function move(e: React.PointerEvent) {
    if (!drawingRef.current || disabled) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !lastRef.current) return;
    const p = getPos(e);
    ctx.strokeStyle = "#ffb547";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lastRef.current.x, lastRef.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastRef.current = p;
    onChange(true);
  }

  function end() {
    drawingRef.current = false;
    lastRef.current = null;
  }

  function clearPad() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange(false);
    setTick((t) => t + 1);
  }

  return (
    <div className="space-y-2">
      <div className="relative rounded-lg border border-orange-400/30 bg-white/[0.04] overflow-hidden h-40">
        <canvas
          ref={canvasRef}
          className="w-full h-full touch-none cursor-crosshair"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onPointerLeave={end}
        />
        <div className="absolute bottom-1 left-2 text-[10px] text-white/30 pointer-events-none">подпись здесь</div>
      </div>
      <button onClick={clearPad} disabled={disabled} className="btn-ghost text-xs">Очистить подпись</button>
    </div>
  );
}
