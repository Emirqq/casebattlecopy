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
  "Consumer Grade": [20, 50],
  "Industrial Grade": [60, 150],
  "Mil-Spec Grade": [180, 400],
  Restricted: [450, 1200],
  Classified: [1300, 3500],
  Covert: [3800, 9500],
  Extraordinary: [4500, 11000],
  Contraband: [9000, 15000],
};

export function rarityRank(r: string): number {
  const i = RARITY_ORDER.indexOf(r as Rarity);
  return i === -1 ? 0 : i;
}
