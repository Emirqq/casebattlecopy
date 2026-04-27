import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";

const Schema = z.object({
  username: z
    .string()
    .trim()
    .min(2, "Ник минимум 2 символа")
    .max(24, "Ник максимум 24 символа")
    .regex(/^[A-Za-z0-9_\-а-яА-ЯёЁ ]+$/, "Только буквы, цифры, _ и -"),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Невалидный JSON" }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ошибка" },
      { status: 400 },
    );
  }
  const username = parsed.data.username;

  let user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        username,
        balance: 1000,
        transactions: { create: { amount: 1000, kind: "bonus", meta: "welcome" } },
      },
    });
  }

  setSessionCookie(user.id);
  return NextResponse.json({ ok: true, user: { id: user.id, username: user.username } });
}
