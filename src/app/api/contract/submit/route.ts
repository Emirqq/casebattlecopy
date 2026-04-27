import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const Schema = z.object({
  inventoryIds: z.array(z.string()).length(10),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Нужно ровно 10 предметов" }, { status: 400 });

  const items = await prisma.inventoryItem.findMany({
    where: {
      id: { in: parsed.data.inventoryIds },
      userId: user.id,
      status: "owned",
    },
    include: { item: true },
  });

  if (items.length !== 10) {
    return NextResponse.json({ error: "Один или несколько предметов недоступны" }, { status: 400 });
  }

  const total = items.reduce((s, i) => s + i.item.price, 0);
  const avg = total / items.length;
  // House edge: 90% of avg as base reward target.
  const targetPrice = Math.round(avg * 0.9);

  // Choose a candidate item with price near targetPrice (within ±50%).
  const candidates = await prisma.item.findMany({
    where: {
      price: {
        gte: Math.max(10, Math.floor(targetPrice * 0.5)),
        lte: Math.ceil(targetPrice * 1.5),
      },
    },
  });

  const pool = candidates.length > 0 ? candidates : await prisma.item.findMany({ take: 100 });
  const winner = pool[Math.floor(Math.random() * pool.length)];

  await prisma.$transaction([
    prisma.inventoryItem.updateMany({
      where: { id: { in: parsed.data.inventoryIds }, userId: user.id, status: "owned" },
      data: { status: "contracted" },
    }),
    prisma.inventoryItem.create({
      data: { userId: user.id, itemId: winner.id, source: "contract" },
    }),
    prisma.transaction.create({
      data: { userId: user.id, amount: 0, kind: "contract", meta: winner.id },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    item: {
      id: winner.id,
      name: winner.name,
      price: winner.price,
      rarity: winner.rarity,
      imageUrl: winner.imageUrl,
    },
  });
}
