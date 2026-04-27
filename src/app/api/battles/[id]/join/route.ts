import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const battle = await prisma.battle.findUnique({
    where: { id: params.id },
    include: { seats: true },
  });
  if (!battle) return NextResponse.json({ error: "Не найден" }, { status: 404 });
  if (battle.status !== "waiting") return NextResponse.json({ error: "Баттл уже начался" }, { status: 400 });
  if (battle.seats.some((s) => s.userId === user.id)) {
    return NextResponse.json({ error: "Уже в баттле" }, { status: 400 });
  }
  const empty = battle.seats.find((s) => !s.userId && !s.isBot);
  if (!empty) return NextResponse.json({ error: "Свободных мест нет" }, { status: 400 });

  const fresh = await prisma.user.findUnique({ where: { id: user.id } });
  if (!fresh || fresh.balance < battle.totalPrice) {
    return NextResponse.json({ error: "Недостаточно монет" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.battleSeat.update({ where: { id: empty.id }, data: { userId: user.id } }),
    prisma.user.update({ where: { id: user.id }, data: { balance: { decrement: battle.totalPrice } } }),
    prisma.transaction.create({
      data: { userId: user.id, amount: -battle.totalPrice, kind: "battle_join", meta: battle.id },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
