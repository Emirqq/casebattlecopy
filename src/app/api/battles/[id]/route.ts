import { NextResponse } from "next/server";
import { getBattle } from "@/lib/battles";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const battle = await getBattle(params.id);
  if (!battle) return NextResponse.json({ error: "Не найден" }, { status: 404 });

  const openings = await prisma.opening.findMany({
    where: { battleId: battle.id },
    include: { item: true, case: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ battle, openings });
}
