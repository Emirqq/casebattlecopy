import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const Schema = z.object({
  mode: z.enum(["1v1", "1v1v1", "2v2"]),
  size: z.number().int().min(2).max(4),
  caseIds: z.array(z.string()).min(1).max(10),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Невалидный запрос" }, { status: 400 });

  const cases = await prisma.case.findMany({ where: { id: { in: parsed.data.caseIds } } });
  if (cases.length !== parsed.data.caseIds.length) {
    return NextResponse.json({ error: "Кейс не найден" }, { status: 404 });
  }

  const totalPrice = parsed.data.caseIds.reduce((s, id) => s + (cases.find((c) => c.id === id)?.price ?? 0), 0);
  const fresh = await prisma.user.findUnique({ where: { id: user.id } });
  if (!fresh || fresh.balance < totalPrice) {
    return NextResponse.json({ error: "Недостаточно монет" }, { status: 400 });
  }

  const battle = await prisma.battle.create({
    data: {
      mode: parsed.data.mode,
      size: parsed.data.size,
      totalPrice,
      createdById: user.id,
      cases: {
        create: parsed.data.caseIds.map((id, idx) => ({ caseId: id, position: idx })),
      },
      seats: {
        create: Array.from({ length: parsed.data.size }, (_, i) => ({
          seat: i,
          userId: i === 0 ? user.id : null,
          isBot: false,
        })),
      },
    },
  });

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { balance: { decrement: totalPrice } } }),
    prisma.transaction.create({
      data: { userId: user.id, amount: -totalPrice, kind: "battle_join", meta: battle.id },
    }),
  ]);

  return NextResponse.json({ ok: true, battleId: battle.id });
}
