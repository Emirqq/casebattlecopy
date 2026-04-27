import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { RARITY_PRICE_RANGE } from "../src/lib/rarity";

const prisma = new PrismaClient();

type Skin = {
  name: string;
  weapon: string;
  image: string;
  rarity: string;
  color: string;
};

// Deterministic price within rarity range based on name hash.
function stableHash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function priceFor(skin: Skin): number {
  const range = RARITY_PRICE_RANGE[skin.rarity];
  if (!range) return 50;
  const [min, max] = range;
  const r = (stableHash(skin.name) % 1000) / 1000;
  return Math.round(min + r * (max - min));
}

type CaseDef = {
  slug: string;
  name: string;
  imageUrl: string;
  price: number;
  /** Filter to pick from skins. */
  filter: (s: Skin) => boolean;
  /** Weights by rarity. Higher = more likely to drop. */
  weights: Record<string, number>;
  /** Fallback image to use as case image when no item matched. */
  itemCount?: number;
};

const CASE_DEFS: CaseDef[] = [
  {
    slug: "starter",
    name: "Стартовый кейс",
    imageUrl: "https://community.akamai.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgporbeAFOgNQ4U3hNhpDJYPxoz4eP3xIgMNapOO_Z2T",
    price: 50,
    filter: (s) =>
      ["Consumer Grade", "Industrial Grade", "Mil-Spec Grade"].includes(s.rarity),
    weights: {
      "Consumer Grade": 50,
      "Industrial Grade": 30,
      "Mil-Spec Grade": 18,
      Restricted: 1.8,
      Classified: 0.2,
    },
  },
  {
    slug: "ak-arsenal",
    name: "АК-47 Арсенал",
    imageUrl:
      "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwlcK3wiNK0POlPPNSI_GBGmKc_uJ_t-l9ASuywktwtW3dwt79eX6fZlUiCJJ1RbUPtkW8w4LiZe_i4ATYjN8WmH7gznQeZkk4ehM",
    price: 320,
    filter: (s) => s.weapon === "AK-47",
    weights: {
      "Mil-Spec Grade": 60,
      Restricted: 25,
      Classified: 12,
      Covert: 3,
    },
  },
  {
    slug: "awp-collection",
    name: "Коллекция AWP",
    imageUrl:
      "https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VN1u5DnuSjsTC_3y6n5wDIbRb20FaIcOudT2NIYLg",
    price: 450,
    filter: (s) => s.weapon === "AWP",
    weights: {
      "Mil-Spec Grade": 55,
      Restricted: 28,
      Classified: 13,
      Covert: 4,
    },
  },
  {
    slug: "soldier",
    name: "Солдатик",
    imageUrl:
      "https://community.akamai.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbiAJjEDvIQYhsgjU8oFwvjYSqj1IAFFP4Eq0p3iNu7eC1lyTAYMaNGpyRjMmJEwhk6T6_HF",
    price: 444,
    filter: (s) =>
      ["Mil-Spec Grade", "Restricted", "Classified", "Covert"].includes(s.rarity),
    weights: {
      "Mil-Spec Grade": 60,
      Restricted: 25,
      Classified: 11,
      Covert: 4,
    },
  },
  {
    slug: "samurai",
    name: "Самурай",
    imageUrl:
      "https://community.akamai.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpov6OAYjcHv9oWl81rGcpegonAGu-jJgUCa9eM_p_v",
    price: 169,
    filter: (s) =>
      ["Industrial Grade", "Mil-Spec Grade", "Restricted"].includes(s.rarity),
    weights: {
      "Industrial Grade": 45,
      "Mil-Spec Grade": 40,
      Restricted: 13,
      Classified: 1.8,
      Covert: 0.2,
    },
  },
  {
    slug: "ronin",
    name: "Ронин",
    imageUrl:
      "https://community.akamai.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpouqGAFAEMMtYeg9Yvb5oZj5b1Ia6gIANGZ4eO_Zv",
    price: 299,
    filter: (s) =>
      ["Mil-Spec Grade", "Restricted", "Classified"].includes(s.rarity),
    weights: {
      "Mil-Spec Grade": 60,
      Restricted: 28,
      Classified: 10,
      Covert: 2,
    },
  },
  {
    slug: "shogun",
    name: "Сёгун",
    imageUrl:
      "https://community.akamai.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovKWAFiUNNYRRkdRrA8sTm5ngfOnnIglNbtTfnpzkPLOcDB54HgwIa9Cq0BQ",
    price: 699,
    filter: (s) =>
      ["Restricted", "Classified", "Covert"].includes(s.rarity),
    weights: {
      Restricted: 60,
      Classified: 30,
      Covert: 10,
    },
  },
  {
    slug: "imperator",
    name: "Император",
    imageUrl:
      "https://community.akamai.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovaWAFiwGMtAaltRwUskZkpvtdrqgIVoUao_dypa6KbeAUEx-AAEKMK6n2RLQfA",
    price: 1999,
    filter: (s) =>
      ["Classified", "Covert"].includes(s.rarity),
    weights: {
      Classified: 70,
      Covert: 30,
    },
  },
];

async function main() {
  const skinsPath = path.join(__dirname, "seed-data", "skins.json");
  const skins: Skin[] = JSON.parse(fs.readFileSync(skinsPath, "utf-8"));

  console.log(`Loaded ${skins.length} skins from seed data`);

  // Clear existing data
  await prisma.opening.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.battleSeat.deleteMany();
  await prisma.battleCase.deleteMany();
  await prisma.battle.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.caseItem.deleteMany();
  await prisma.case.deleteMany();
  await prisma.item.deleteMany();

  // Create items.
  const itemRecords = await Promise.all(
    skins.map((s) =>
      prisma.item.create({
        data: {
          name: s.name,
          weapon: s.weapon,
          imageUrl: s.image,
          price: priceFor(s),
          rarity: s.rarity,
        },
      }),
    ),
  );
  console.log(`Created ${itemRecords.length} items`);

  // Create cases with item assignments.
  for (const def of CASE_DEFS) {
    const matching = skins
      .map((s, i) => ({ skin: s, record: itemRecords[i] }))
      .filter(({ skin }) => def.filter(skin));

    if (matching.length === 0) {
      console.warn(`No items matched filter for case ${def.slug}`);
      continue;
    }

    // Pick representative image: highest-priority rarity in the case.
    const RARITY_PRIO = ["Covert", "Classified", "Restricted", "Mil-Spec Grade", "Industrial Grade", "Consumer Grade"];
    let representative = matching[0];
    for (const r of RARITY_PRIO) {
      const found = matching.find(({ skin }) => skin.rarity === r);
      if (found) {
        representative = found;
        break;
      }
    }
    const imageUrl = def.imageUrl.startsWith("https://community.akamai")
      ? representative.skin.image
      : def.imageUrl;

    const created = await prisma.case.create({
      data: {
        slug: def.slug,
        name: def.name,
        imageUrl,
        price: def.price,
        itemCount: matching.length,
      },
    });

    for (const { skin, record } of matching) {
      const weight = def.weights[skin.rarity] ?? 1;
      // Convert weight to integer (multiply by 100 to keep precision).
      await prisma.caseItem.create({
        data: {
          caseId: created.id,
          itemId: record.id,
          weight: Math.max(1, Math.round(weight * 100)),
        },
      });
    }
    console.log(`Created case ${def.slug} with ${matching.length} items`);
  }

  console.log("Seed complete.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
