import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const TOPUP_AMOUNT = 1000;

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      balance: { increment: TOPUP_AMOUNT },
      transactions: { create: { amount: TOPUP_AMOUNT, kind: "bonus", meta: "topup" } },
    },
  });

  return NextResponse.json({ ok: true, balance: updated.balance });
}
