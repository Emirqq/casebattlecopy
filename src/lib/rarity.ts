export const RARITY_ORDER = [
  "Consumer Grade",
  "Industrial Grade",
  "Mil-Spec Grade",
  "Restricted",
  "Classified",
  "Covert",
  "Extraordinary",
  "Contraband",
] as const;

export type Rarity = (typeof RARITY_ORDER)[number];

export const RARITY_COLOR: Record<string, string> = {
  "Consumer Grade": "#b0c3d9",
  "Industrial Grade": "#5e98d9",
  "Mil-Spec Grade": "#4b69ff",
  Restricted: "#8847ff",
  Classified: "#d32ce6",
  Covert: "#eb4b4b",
  Extraordinary: "#eb4b4b",
  Contraband: "#e4ae39",
};

export const RARITY_LABEL_RU: Record<string, string> = {
  "Consumer Grade": "Ширпотреб",
  "Industrial Grade": "Промышленное",
  "Mil-Spec Grade": "Армейское",
  Restricted: "Запрещённое",
  Classified: "Засекреченное",
  Covert: "Тайное",
  Extraordinary: "Особое",
  Contraband: "Контрабанда",
};

export const RARITY_PRICE_RANGE: Record<string, [number, number]> = {
  "Consumer Grade": [20, 60],
  "Industrial Grade": [70, 180],
  "Mil-Spec Grade": [200, 500],
  Restricted: [550, 1500],
  Classified: [1800, 5500],
  Covert: [6500, 22000],
  Extraordinary: [12000, 45000],
  Contraband: [60000, 250000],
};

export function rarityRank(r: string): number {
  const i = RARITY_ORDER.indexOf(r as Rarity);
  return i === -1 ? 0 : i;
}
