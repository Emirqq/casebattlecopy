import { notFound } from "next/navigation";
import { getBattle } from "@/lib/battles";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BattleView } from "@/components/BattleView";

export const dynamic = "force-dynamic";

export default async function BattlePage({ params }: { params: { id: string } }) {
  const battle = await getBattle(params.id);
  if (!battle) notFound();

  const user = await getCurrentUser();
  const openings = await prisma.opening.findMany({
    where: { battleId: battle.id },
    include: { item: true, case: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <BattleView
      battle={{
        id: battle.id,
        mode: battle.mode,
        size: battle.size,
        status: battle.status,
        totalPrice: battle.totalPrice,
        winnerSeat: battle.winnerSeat,
        createdById: battle.createdById,
        cases: battle.cases.map((bc) => ({
          id: bc.case.id,
          slug: bc.case.slug,
          name: bc.case.name,
          imageUrl: bc.case.imageUrl,
        })),
        seats: battle.seats.map((s) => ({
          seat: s.seat,
          userId: s.userId,
          isBot: s.isBot,
          total: s.total,
          username: s.user?.username ?? null,
        })),
      }}
      openings={openings.map((o) => ({
        seat: o.seat ?? battle.seats.find((s) => s.userId === o.userId)?.seat ?? -1,
        caseId: o.caseId,
        itemName: o.item.name,
        itemImage: o.item.imageUrl,
        rarity: o.item.rarity,
        price: o.item.price,
      }))}
      currentUserId={user?.id ?? null}
    />
  );
}
