import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatCoins } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cases = await prisma.case.findMany({
    orderBy: { price: "asc" },
  });

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-orange-500/10 via-transparent to-amber-400/5 p-8">
        <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">
              Открывай кейсы и сражайся за{" "}
              <span className="text-orange-400">скины</span>
            </h1>
            <p className="text-[color:var(--muted)] mt-2">
              Демо-версия с виртуальной валютой. Стартовый баланс — 1000 монет, дополни в любой момент.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/battles" className="btn-primary">Создать баттл</Link>
            <Link href="/login" className="btn-ghost">Авторизоваться</Link>
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
              className="card group hover:border-orange-400/40 transition relative"
            >
              <div className="aspect-square bg-gradient-to-b from-white/5 to-transparent flex items-center justify-center p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.imageUrl}
                  alt={c.name}
                  className="max-h-full max-w-full object-contain group-hover:scale-105 transition"
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
