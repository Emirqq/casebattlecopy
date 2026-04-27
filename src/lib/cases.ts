import { prisma } from "./db";
import { pickWeighted } from "./random";

export async function getCaseWithItems(slug: string) {
  return prisma.case.findUnique({
    where: { slug },
    include: {
      items: {
        include: { item: true },
        orderBy: { weight: "asc" },
      },
    },
  });
}

export type CaseWithItems = NonNullable<Awaited<ReturnType<typeof getCaseWithItems>>>;

export function rollCase(caseWithItems: CaseWithItems) {
  if (caseWithItems.items.length === 0) {
    throw new Error("Case has no items");
  }
  const choice = pickWeighted(
    caseWithItems.items.map((ci) => ({ value: ci, weight: ci.weight })),
  );
  return choice.item;
}
