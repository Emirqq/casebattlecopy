import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const Schema = z.object({
  inventoryIds: z.array(z.string()).min(3).max(10),
  targetItemId: z.string().nullable().optional(),
  priceMin: z.number().int().min(0).optional(),
  priceMax: z.number().int().min(0).optional(),
});

const HOUSE_EDGE = 0.9;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Нужно от 3 до 10 предметов" }, { status: 400 });
  }
  const { inventoryIds, targetItemId, priceMin, priceMax } = parsed.data;

  const uniqIds = Array.from(new Set(inventoryIds));
  if (uniqIds.length !== inventoryIds.length) {
    return NextResponse.json({ error: "Дубликаты предметов" }, { status: 400 });
  }

  const items = await prisma.inventoryItem.findMany({
    where: {
      id: { in: uniqIds },
      userId: user.id,
      status: "owned",
    },
    include: { item: true },
  });

  if (items.length !== uniqIds.length) {
    return NextResponse.json({ error: "Один или несколько предметов недоступны" }, { status: 400 });
  }

  const total = items.reduce((s, i) => s + i.item.price, 0);
  const avg = total / items.length;
  // Reward target value: average × house edge.
  const baseReward = Math.max(10, Math.round(avg * HOUSE_EDGE));

  let winner: { id: string; name: string; price: number; rarity: string; imageUrl: string } | null = null;

  if (targetItemId) {
    // Specific target requested. Probability = (avg * HOUSE_EDGE / target.price), capped.
    const target = await prisma.item.findUnique({ where: { id: targetItemId } });
    if (!target) return NextResponse.json({ error: "Цель не найдена" }, { status: 404 });
    const p = Math.min(0.95, Math.max(0, (avg * HOUSE_EDGE) / target.price));
    if (Math.random() < p) {
      winner = target;
    } else {
      // On loss with specific target: produce a small consolation item near baseReward × 0.3
      const consolationTarget = Math.max(10, Math.round(baseReward * 0.3));
      const pool = await prisma.item.findMany({
        where: {
          price: { gte: Math.max(10, Math.floor(consolationTarget * 0.5)), lte: Math.ceil(consolationTarget * 1.5) },
        },
        take: 200,
      });
      const fallback = pool.length > 0 ? pool : await prisma.item.findMany({ take: 50, orderBy: { price: "asc" } });
      winner = fallback[Math.floor(Math.random() * fallback.length)];
    }
  } else {
    // Random mode: pick a candidate item near baseReward, optionally constrained by price filter.
    const minP = priceMin ?? Math.max(10, Math.floor(baseReward * 0.5));
    const maxP = priceMax ?? Math.ceil(baseReward * 1.5);
    const candidates = await prisma.item.findMany({
      where: {
        price: { gte: Math.max(10, minP), lte: Math.max(maxP, minP + 10) },
      },
      take: 400,
    });
    const pool = candidates.length > 0 ? candidates : await prisma.item.findMany({ take: 100 });
    winner = pool[Math.floor(Math.random() * pool.length)];
  }

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
  });
}
