import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const Schema = z.object({
  inventoryIds: z.array(z.string()).min(3).max(10),
});

const HOUSE_EDGE = 0.9;

// Range factors mirror the UI hint shown to the player. Applied to TOTAL value
// of the deposit so a 3-skin contract worth 12k coins can return up to ~19k.
const MIN_FACTOR = 0.55;
const MAX_FACTOR = 1.6;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Нужно от 3 до 10 предметов" }, { status: 400 });
  }
  const { inventoryIds } = parsed.data;

  const uniqIds = Array.from(new Set(inventoryIds));
  if (uniqIds.length !== inventoryIds.length) {
    return NextResponse.json({ error: "Дубликаты предметов" }, { status: 400 });
  }

  const items = await prisma.inventoryItem.findMany({
    where: { id: { in: uniqIds }, userId: user.id, status: "owned" },
    include: { item: true },
  });

  if (items.length !== uniqIds.length) {
    return NextResponse.json({ error: "Один или несколько предметов недоступны" }, { status: 400 });
  }

  const total = items.reduce((s, i) => s + i.item.price, 0);
  const baseReward = Math.max(10, Math.round(total * HOUSE_EDGE));
  const minP = Math.max(10, Math.floor(total * MIN_FACTOR));
  const maxP = Math.max(minP + 10, Math.ceil(total * MAX_FACTOR));

  let pool = await prisma.item.findMany({
    where: { price: { gte: minP, lte: maxP } },
    take: 600,
  });
  if (pool.length === 0) {
    pool = await prisma.item.findMany({ take: 100 });
  }
  const winner = pool[Math.floor(Math.random() * pool.length)];
  if (!winner) return NextResponse.json({ error: "Не удалось подобрать награду" }, { status: 500 });

  await prisma.$transaction([
    prisma.inventoryItem.updateMany({
      where: { id: { in: uniqIds }, userId: user.id, status: "owned" },
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
    range: { min: minP, max: maxP, expected: baseReward },
  });
}
