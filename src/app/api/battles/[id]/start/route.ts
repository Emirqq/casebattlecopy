import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { rollBattle } from "@/lib/battles";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const battle = await prisma.battle.findUnique({
    where: { id: params.id },
    include: { seats: true },
  });
  if (!battle) return NextResponse.json({ error: "Не найден" }, { status: 404 });
  if (battle.createdById !== user.id) {
    return NextResponse.json({ error: "Только создатель может стартовать" }, { status: 403 });
  }
  if (battle.status !== "waiting") return NextResponse.json({ error: "Баттл уже начался" }, { status: 400 });

  // Fill empty seats with bots.
  await prisma.battleSeat.updateMany({
    where: { battleId: battle.id, userId: null, isBot: false },
    data: { isBot: true },
  });

  await prisma.battle.update({
    where: { id: battle.id },
    data: { status: "rolling", startedAt: new Date() },
  });

  // Roll synchronously (simple approach).
  await rollBattle(battle.id);

  return NextResponse.json({ ok: true });
}
