import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const HOUSE_EDGE = 0.92;

const Schema = z.object({
  sourceInventoryIds: z.array(z.string()).max(6).default([]),
  balanceAmount: z.number().int().min(0).default(0),
  targetItemId: z.string(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Невалидный запрос" }, { status: 400 });

  const { sourceInventoryIds, balanceAmount, targetItemId } = parsed.data;
  if (sourceInventoryIds.length === 0 && balanceAmount <= 0) {
    return NextResponse.json({ error: "Выбери источник для апгрейда" }, { status: 400 });
  }

  const target = await prisma.item.findUnique({ where: { id: targetItemId } });
  if (!target) return NextResponse.json({ error: "Цель не найдена" }, { status: 404 });

  const uniqIds = Array.from(new Set(sourceInventoryIds));
  const invs = uniqIds.length
    ? await prisma.inventoryItem.findMany({
        where: { id: { in: uniqIds } },
        include: { item: true },
      })
    : [];
  if (invs.length !== uniqIds.length || invs.some((i) => i.userId !== user.id || i.status !== "owned")) {
    return NextResponse.json({ error: "Предмет недоступен" }, { status: 400 });
  }

  let sourceValue = invs.reduce((s, i) => s + i.item.price, 0);
  if (balanceAmount > 0) {
    const fresh = await prisma.user.findUnique({ where: { id: user.id } });
    if (!fresh || fresh.balance < balanceAmount) {
      return NextResponse.json({ error: "Недостаточно монет" }, { status: 400 });
    }
    sourceValue += balanceAmount;
  }

  if (target.price <= sourceValue) {
    return NextResponse.json({ error: "Цель должна быть дороже ставки" }, { status: 400 });
  }

  const chance = Math.min(0.95, Math.max(0, (sourceValue / target.price) * HOUSE_EDGE));
  const won = Math.random() < chance;

  // Burn source items unconditionally (they go to "upgraded" regardless of win/lose).
  if (uniqIds.length) {
    await prisma.inventoryItem.updateMany({
      where: { id: { in: uniqIds } },
      data: { status: "upgraded" },
    });
  }

  // Burn balance topup (always — that's the stake in coins).
  if (balanceAmount > 0) {
    await prisma.user.update({
      where: { id: user.id },
      data: { balance: { decrement: balanceAmount } },
    });
    await prisma.transaction.create({
      data: { userId: user.id, amount: -balanceAmount, kind: "upgrade_stake", meta: target.id },
    });
  }

  if (won) {
    await prisma.inventoryItem.create({
      data: { userId: user.id, itemId: target.id, source: "upgrade" },
    });
    await prisma.transaction.create({
      data: { userId: user.id, amount: target.price, kind: "upgrade_win", meta: target.id },
    });
  } else if (uniqIds.length) {
    // Also log a loss record covering item value if no balance stake (so transactions show something).
    const totalValue = invs.reduce((s, i) => s + i.item.price, 0);
    if (totalValue > 0) {
      await prisma.transaction.create({
        data: { userId: user.id, amount: -totalValue, kind: "upgrade_lose", meta: target.id },
      });
    }
  }

  return NextResponse.json({ ok: true, won, chance, sourceValue });
}
