import { notFound } from "next/navigation";
import { getCaseWithItems } from "@/lib/cases";
import { CaseOpener } from "@/components/CaseOpener";
import { RARITY_COLOR, RARITY_LABEL_RU, rarityRank } from "@/lib/rarity";
import { formatCoins } from "@/lib/format";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CasePage({ params }: { params: { slug: string } }) {
  const caseRow = await getCaseWithItems(params.slug);
  if (!caseRow) notFound();

  const user = await getCurrentUser();

  // Sort items by rarity desc then by price desc.
  const sortedItems = [...caseRow.items].sort((a, b) => {
    const r = rarityRank(b.item.rarity) - rarityRank(a.item.rarity);
    return r !== 0 ? r : b.item.price - a.item.price;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="w-32 h-32 shrink-0 bg-gradient-to-b from-white/5 to-transparent rounded-xl flex items-center justify-center p-3 border border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={caseRow.imageUrl} alt={caseRow.name} className="max-w-full max-h-full object-contain" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold uppercase">{caseRow.name}</h1>
          <p className="text-[color:var(--muted)] text-sm">{caseRow.itemCount} предметов внутри</p>
          <div className="mt-2 price-badge">{formatCoins(caseRow.price)} монет</div>
        </div>
      </div>

      <CaseOpener
        slug={caseRow.slug}
        price={caseRow.price}
        items={caseRow.items.map((ci) => ({
          id: ci.item.id,
          name: ci.item.name,
          weapon: ci.item.weapon,
          imageUrl: ci.item.imageUrl,
          price: ci.item.price,
          rarity: ci.item.rarity,
        }))}
        userBalance={user?.balance ?? null}
        loggedIn={!!user}
      />

      <section>
        <h2 className="text-lg font-bold uppercase tracking-wider mb-3">Содержимое кейса</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {sortedItems.map((ci) => (
            <div
              key={ci.id}
              className="card p-3 relative overflow-visible"
              style={{ borderColor: `${RARITY_COLOR[ci.item.rarity] ?? "#444"}55` }}
            >
              <div
                className="rarity-bar mb-2"
                style={{ background: RARITY_COLOR[ci.item.rarity] ?? "#888" }}
              />
              <div className="aspect-[4/3] flex items-center justify-center bg-white/[0.02] rounded">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ci.item.imageUrl} alt={ci.item.name} className="max-h-full max-w-full object-contain" loading="lazy" />
              </div>
              <div className="mt-2 text-xs text-[color:var(--muted)] truncate">{ci.item.weapon}</div>
              <div className="text-sm font-medium truncate">{ci.item.name.replace(/^.*\|\s*/, "")}</div>
              <div className="flex justify-between items-center mt-1">
                <span
                  className="text-[10px] uppercase tracking-wider"
                  style={{ color: RARITY_COLOR[ci.item.rarity] }}
                >
                  {RARITY_LABEL_RU[ci.item.rarity] ?? ci.item.rarity}
                </span>
                <span className="text-orange-300 text-xs font-bold">{formatCoins(ci.item.price)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
