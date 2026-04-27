import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatCoins } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cases = await prisma.case.findMany({
    orderBy: { price: "asc" },
  });

  return (
    <div className="space-y-10">
      <section className="relative rounded-2xl border border-white/10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/15 via-transparent to-purple-500/10 pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-orange-400/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-purple-400/15 blur-3xl pointer-events-none" />
        <div className="relative px-6 md:px-10 py-10 flex flex-col md:flex-row md:items-end gap-6 justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-orange-400/30 bg-orange-400/10 text-orange-300 text-xs uppercase tracking-wider mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              Демо-режим
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
              Открывай кейсы и сражайся за{" "}
              <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">скины</span>
            </h1>
            <p className="text-[color:var(--muted)] mt-3 md:text-lg">
              Виртуальная валюта, никаких реальных платежей. Стартовый баланс — 1000 монет, кнопка <span className="text-orange-300 font-semibold">+1000</span> в шапке всегда доступна.
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              <Link href="/battles" className="btn-primary">⚔ Создать баттл</Link>
              <Link href="/upgrade" className="btn-ghost">↗ Апгрейд</Link>
              <Link href="/contracts" className="btn-ghost">⊟ Контракты</Link>
            </div>
          </div>
          <div className="hidden md:flex flex-col items-end gap-2 text-right">
            <div className="text-xs uppercase tracking-wider text-[color:var(--muted)]">Кейсов в каталоге</div>
            <div className="text-5xl font-extrabold text-white">{cases.length}</div>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold uppercase tracking-wider">Серийные кейсы</h2>
          <span className="text-sm text-[color:var(--muted)]">{cases.length} шт.</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {cases.map((c) => (
            <Link
              key={c.id}
              href={`/case/${c.slug}`}
              className="card card-hover group relative"
            >
              <div className="aspect-square bg-gradient-to-b from-orange-400/5 to-transparent flex items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,122,26,0.15),transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.imageUrl}
                  alt={c.name}
                  className="max-h-full max-w-full object-contain group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300 floaty"
                  loading="lazy"
                />
              </div>
              <div className="p-3 border-t border-white/5">
                <div className="font-semibold text-sm uppercase tracking-wide truncate">{c.name}</div>
                <div className="text-xs text-[color:var(--muted)] mb-2">{c.itemCount} предметов</div>
                <div className="price-badge w-full">{formatCoins(c.price)} монет</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
