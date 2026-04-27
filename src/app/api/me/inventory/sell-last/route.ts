import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const last = await prisma.inventoryItem.findFirst({
    where: { userId: user.id, status: "owned" },
    include: { item: true },
    orderBy: { createdAt: "desc" },
  });
  if (!last) return NextResponse.json({ error: "Нет предметов" }, { status: 400 });

  await prisma.$transaction([
    prisma.inventoryItem.update({
      where: { id: last.id },
      data: { status: "sold" },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { balance: { increment: last.item.price } },
    }),
    prisma.transaction.create({
      data: {
        userId: user.id,
        amount: last.item.price,
        kind: "sell",
        meta: last.itemId,
      },
    }),
  ]);

  return NextResponse.json({ ok: true, sold: last.item.price });
}
