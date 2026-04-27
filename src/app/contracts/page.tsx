import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { rarityRank } from "@/lib/rarity";
import { ContractsClient } from "@/components/ContractsClient";

export const dynamic = "force-dynamic";

export default async function ContractsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [inventory, allItems] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { userId: user.id, status: "owned" },
      include: { item: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.item.findMany({
      orderBy: { price: "asc" },
    }),
  ]);

  return (
    <ContractsClient
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
      allItems={allItems.map((i) => ({
        id: i.id,
        name: i.name,
        imageUrl: i.imageUrl,
        price: i.price,
        rarity: i.rarity,
        weapon: i.weapon,
      }))}
    />
  );
}
