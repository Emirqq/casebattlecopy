import { prisma } from "./db";
import { rollCase } from "./cases";

export async function getBattle(id: string) {
  return prisma.battle.findUnique({
    where: { id },
    include: {
      cases: { include: { case: true }, orderBy: { position: "asc" } },
      seats: {
        include: { user: true },
        orderBy: { seat: "asc" },
      },
    },
  });
}

export type FullBattle = NonNullable<Awaited<ReturnType<typeof getBattle>>>;

export async function rollBattle(battleId: string) {
  const battle = await prisma.battle.findUnique({
    where: { id: battleId },
    include: {
      cases: {
        include: {
          case: { include: { items: { include: { item: true } } } },
        },
        orderBy: { position: "asc" },
      },
      seats: { orderBy: { seat: "asc" } },
    },
  });
  if (!battle) throw new Error("Battle not found");
  if (battle.status === "finished") return battle;

  // For each case, roll for each seat.
  const seatTotals = new Map<number, number>();
  battle.seats.forEach((s) => seatTotals.set(s.seat, 0));

  const rounds: { caseId: string; seat: number; itemId: string; price: number }[] = [];
  for (const bc of battle.cases) {
    for (const seat of battle.seats) {
      const item = rollCase(bc.case);
      seatTotals.set(seat.seat, (seatTotals.get(seat.seat) ?? 0) + item.price);
      rounds.push({ caseId: bc.caseId, seat: seat.seat, itemId: item.id, price: item.price });
    }
  }

  // Determine winner: highest total. Tie-break: lowest seat number.
  let winnerSeat = battle.seats[0].seat;
  let winnerTotal = seatTotals.get(winnerSeat) ?? 0;
  for (const seat of battle.seats) {
    const t = seatTotals.get(seat.seat) ?? 0;
    if (t > winnerTotal) {
      winnerSeat = seat.seat;
      winnerTotal = t;
    }
  }

  await prisma.$transaction(async (tx) => {
    // Persist openings + per-seat totals.
    for (const r of rounds) {
      const seat = battle.seats.find((s) => s.seat === r.seat)!;
      await tx.opening.create({
        data: {
          userId: seat.userId,
          caseId: r.caseId,
          itemId: r.itemId,
          battleId: battle.id,
          seat: r.seat,
          isBot: seat.isBot,
        },
      });
    }

    for (const seat of battle.seats) {
      const total = seatTotals.get(seat.seat) ?? 0;
      await tx.battleSeat.update({
        where: { id: seat.id },
        data: { total },
      });
    }

    await tx.battle.update({
      where: { id: battle.id },
      data: { status: "finished", winnerSeat, finishedAt: new Date() },
    });

    // Award winner: all rolled items go to winner if it's a real user.
    const winnerSeatRow = battle.seats.find((s) => s.seat === winnerSeat)!;
    if (winnerSeatRow.userId) {
      // Add all items from all rounds (across all seats) to winner.
      for (const r of rounds) {
        await tx.inventoryItem.create({
          data: {
            userId: winnerSeatRow.userId,
            itemId: r.itemId,
            source: "battle",
          },
        });
      }
      const totalValue = rounds.reduce((s, r) => s + r.price, 0);
      await tx.transaction.create({
        data: {
          userId: winnerSeatRow.userId,
          amount: totalValue,
          kind: "battle_win",
          meta: battle.id,
        },
      });
    }
  });

  return prisma.battle.findUnique({
    where: { id: battle.id },
    include: {
      cases: { include: { case: true }, orderBy: { position: "asc" } },
      seats: { include: { user: true }, orderBy: { seat: "asc" } },
    },
  });
}

const BOT_NAMES = ["BotMike", "BotLisa", "BotAlex", "BotKate", "BotIvan", "BotZara"];
let botCounter = 0;

export async function fillBotSeat(battleId: string, seat: number) {
  const name = BOT_NAMES[botCounter++ % BOT_NAMES.length];
  return prisma.battleSeat.update({
    where: { battleId_seat: { battleId, seat } },
    data: { isBot: true, userId: null },
  }).then(() => name);
}
