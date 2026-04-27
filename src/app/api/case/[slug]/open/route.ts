import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getCaseWithItems, rollCase } from "@/lib/cases";

const Schema = z.object({
  count: z.number().int().min(1).max(5).default(1),
});

const ALLOWED_COUNTS = new Set([1, 2, 3, 5]);

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Невалидный запрос" }, { status: 400 });
  const count = parsed.data.count;
  if (!ALLOWED_COUNTS.has(count)) {
    return NextResponse.json({ error: "Допустимо открывать 1, 2, 3 или 5 кейсов" }, { status: 400 });
  }

  const caseRow = await getCaseWithItems(params.slug);
  if (!caseRow) return NextResponse.json({ error: "Кейс не найден" }, { status: 404 });

  const totalCost = caseRow.price * count;
  const fresh = await prisma.user.findUnique({ where: { id: user.id } });
  if (!fresh) return NextResponse.json({ error: "Сессия устарела" }, { status: 401 });
  if (fresh.balance < totalCost) {
    return NextResponse.json({ error: "Недостаточно монет" }, { status: 400 });
  }

  const items = Array.from({ length: count }, () => rollCase(caseRow));

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { balance: { decrement: totalCost } },
    }),
    prisma.transaction.create({
      data: {
        userId: user.id,
        amount: -totalCost,
        kind: count > 1 ? "open_multi" : "open",
        meta: count > 1 ? `${caseRow.slug}×${count}` : caseRow.slug,
      },
    }),
    ...items.map((it) =>
      prisma.inventoryItem.create({
        data: { userId: user.id, itemId: it.id, source: "case" },
      })
    ),
    ...items.map((it) =>
      prisma.opening.create({
        data: { userId: user.id, caseId: caseRow.id, itemId: it.id },
      })
    ),
  ]);

  return NextResponse.json({
    ok: true,
    items: items.map((it) => ({
      id: it.id,
      name: it.name,
      weapon: it.weapon,
      imageUrl: it.imageUrl,
      price: it.price,
      rarity: it.rarity,
    })),
  });
}
