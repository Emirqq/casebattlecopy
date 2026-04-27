import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatCoins } from "@/lib/format";
import { rarityRank } from "@/lib/rarity";
import { InventoryGrid } from "@/components/InventoryGrid";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [inventory, txCount, openCount, lastTx] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { userId: user.id, status: "owned" },
      include: { item: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.transaction.count({ where: { userId: user.id } }),
    prisma.opening.count({ where: { userId: user.id } }),
    prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const inventoryValue = inventory.reduce((s, i) => s + i.item.price, 0);
  const sortedInventory = [...inventory].sort((a, b) =>
    rarityRank(b.item.rarity) - rarityRank(a.item.rarity) || b.item.price - a.item.price,
  );

  return (
    <div className="space-y-6">
      <section className="card p-6 flex flex-col md:flex-row md:items-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-3xl font-extrabold">
          {user.username[0]?.toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{user.username}</h1>
          <p className="text-sm text-[color:var(--muted)]">
            Демо-аккаунт, никаких реальных платежей.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center min-w-fit">
          <Stat label="Баланс" value={formatCoins(user.balance)} accent />
          <Stat label="Открыто кейсов" value={openCount.toString()} />
          <Stat label="Транзакций" value={txCount.toString()} />
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold uppercase tracking-wider">Инвентарь</h2>
          <div className="text-sm text-[color:var(--muted)]">
            {inventory.length} шт. ·{" "}
            <span className="text-orange-300 font-semibold">{formatCoins(inventoryValue)}</span> монет
          </div>
        </div>
        <InventoryGrid
          items={sortedInventory.map((i) => ({
            id: i.id,
            itemId: i.itemId,
            name: i.item.name,
            imageUrl: i.item.imageUrl,
            price: i.item.price,
            rarity: i.item.rarity,
            weapon: i.item.weapon,
          }))}
        />
        {inventory.length === 0 && (
          <div className="card p-8 text-center text-[color:var(--muted)]">
            Инвентарь пуст. <Link href="/" className="text-orange-300 hover:underline">Открой кейс</Link>.
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold uppercase tracking-wider mb-3">Последние транзакции</h2>
        <div className="card divide-y divide-white/5">
          {lastTx.length === 0 ? (
            <div className="p-4 text-[color:var(--muted)] text-sm">Пусто</div>
          ) : (
            lastTx.map((t) => (
              <div key={t.id} className="px-4 py-3 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{kindLabel(t.kind)}</div>
                  <div className="text-xs text-[color:var(--muted)]">
                    {new Date(t.createdAt).toLocaleString("ru-RU")}
                  </div>
                </div>
                <div className={t.amount >= 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                  {t.amount >= 0 ? "+" : ""}
                  {formatCoins(t.amount)}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-[color:var(--muted)]">{label}</div>
      <div className={`text-lg font-bold ${accent ? "text-orange-300" : ""}`}>{value}</div>
    </div>
  );
}

function kindLabel(k: string): string {
  switch (k) {
    case "bonus":
      return "Демо-бонус";
    case "open":
      return "Открытие кейса";
    case "sell":
      return "Продажа предмета";
    case "upgrade_win":
      return "Апгрейд: победа";
    case "upgrade_lose":
      return "Апгрейд: проигрыш";
    case "contract":
      return "Контракт";
    case "battle_join":
      return "Баттл: вход";
    case "battle_win":
      return "Баттл: победа";
    default:
      return k;
  }
}
