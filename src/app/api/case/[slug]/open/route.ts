import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getCaseWithItems, rollCase } from "@/lib/cases";

export async function POST(_req: Request, { params }: { params: { slug: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const caseRow = await getCaseWithItems(params.slug);
  if (!caseRow) return NextResponse.json({ error: "Кейс не найден" }, { status: 404 });

  const fresh = await prisma.user.findUnique({ where: { id: user.id } });
  if (!fresh) return NextResponse.json({ error: "Сессия устарела" }, { status: 401 });
  if (fresh.balance < caseRow.price) {
    return NextResponse.json({ error: "Недостаточно монет" }, { status: 400 });
  }

  const item = rollCase(caseRow);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { balance: { decrement: caseRow.price } },
    }),
    prisma.transaction.create({
      data: {
        userId: user.id,
        amount: -caseRow.price,
        kind: "open",
        meta: caseRow.slug,
      },
    }),
    prisma.inventoryItem.create({
      data: { userId: user.id, itemId: item.id, source: "case" },
    }),
    prisma.opening.create({
      data: { userId: user.id, caseId: caseRow.id, itemId: item.id },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    item: {
      id: item.id,
      name: item.name,
      weapon: item.weapon,
      imageUrl: item.imageUrl,
      price: item.price,
      rarity: item.rarity,
    },
  });
}
