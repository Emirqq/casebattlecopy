import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { rarityRank } from "@/lib/rarity";
import { UpgradeClient } from "@/components/UpgradeClient";

export const dynamic = "force-dynamic";

export default async function UpgradePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [inventory, allItems] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { userId: user.id, status: "owned" },
      include: { item: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.item.findMany({ orderBy: { price: "asc" } }),
  ]);

  return (
    <UpgradeClient
      balance={user.balance}
      inventory={inventory
        .sort((a, b) => rarityRank(b.item.rarity) - rarityRank(a.item.rarity) || b.item.price - a.item.price)
        .map((i) => ({
          id: i.id,
          itemId: i.itemId,
          name: i.item.name,
          imageUrl: i.item.imageUrl,
          price: i.item.price,
          rarity: i.item.rarity,
          weapon: i.item.weapon,
        }))}
      allItems={allItems.map((it) => ({
        id: it.id,
        name: it.name,
        imageUrl: it.imageUrl,
        price: it.price,
        rarity: it.rarity,
        weapon: it.weapon,
      }))}
    />
  );
}
