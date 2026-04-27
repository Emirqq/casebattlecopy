import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const Schema = z.object({ inventoryId: z.string() });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Невалидный запрос" }, { status: 400 });

  const inv = await prisma.inventoryItem.findUnique({
    where: { id: parsed.data.inventoryId },
    include: { item: true },
  });
  if (!inv || inv.userId !== user.id || inv.status !== "owned") {
    return NextResponse.json({ error: "Предмет недоступен" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.inventoryItem.update({ where: { id: inv.id }, data: { status: "sold" } }),
    prisma.user.update({
      where: { id: user.id },
      data: { balance: { increment: inv.item.price } },
    }),
    prisma.transaction.create({
      data: { userId: user.id, amount: inv.item.price, kind: "sell", meta: inv.itemId },
    }),
  ]);

  return NextResponse.json({ ok: true, sold: inv.item.price });
}
