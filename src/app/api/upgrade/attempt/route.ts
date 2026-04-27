import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const HOUSE_EDGE = 0.92;

const Schema = z.object({
  source: z.discriminatedUnion("type", [
    z.object({ type: z.literal("item"), inventoryId: z.string() }),
    z.object({ type: z.literal("balance"), amount: z.number().int().positive() }),
  ]),
  targetItemId: z.string(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Невалидный запрос" }, { status: 400 });

  const target = await prisma.item.findUnique({ where: { id: parsed.data.targetItemId } });
  if (!target) return NextResponse.json({ error: "Цель не найдена" }, { status: 404 });

  let sourceValue = 0;
  let sourceInv: { id: string; itemId: string } | null = null;

  if (parsed.data.source.type === "item") {
    const inv = await prisma.inventoryItem.findUnique({
      where: { id: parsed.data.source.inventoryId },
      include: { item: true },
    });
    if (!inv || inv.userId !== user.id || inv.status !== "owned") {
      return NextResponse.json({ error: "Предмет недоступен" }, { status: 400 });
    }
    sourceValue = inv.item.price;
    sourceInv = { id: inv.id, itemId: inv.itemId };
  } else {
    const fresh = await prisma.user.findUnique({ where: { id: user.id } });
    if (!fresh || fresh.balance < parsed.data.source.amount) {
      return NextResponse.json({ error: "Недостаточно монет" }, { status: 400 });
    }
    sourceValue = parsed.data.source.amount;
  }

  if (target.price <= sourceValue) {
    return NextResponse.json({ error: "Цель должна быть дороже ставки" }, { status: 400 });
  }

  const chance = Math.min(0.95, (sourceValue / target.price) * HOUSE_EDGE);
  const won = Math.random() < chance;

  // Apply.
  if (sourceInv) {
    await prisma.inventoryItem.update({
      where: { id: sourceInv.id },
      data: { status: "upgraded" },
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { balance: { decrement: sourceValue } },
    });
    await prisma.transaction.create({
      data: { userId: user.id, amount: -sourceValue, kind: "upgrade_lose", meta: target.id },
    });
  }

  if (won) {
    await prisma.inventoryItem.create({
      data: { userId: user.id, itemId: target.id, source: "upgrade" },
    });
    await prisma.transaction.create({
      data: { userId: user.id, amount: target.price, kind: "upgrade_win", meta: target.id },
    });
  }

  return NextResponse.json({ ok: true, won, chance });
}
