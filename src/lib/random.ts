export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Hash-based pseudo-random number from a string seed (deterministic). */
export function seededRandom(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h >>> 0) / 4294967295;
}

export function pickWeighted<T>(
  items: { value: T; weight: number }[],
  rand: number = Math.random(),
): T {
  const total = items.reduce((s, it) => s + it.weight, 0);
  let r = rand * total;
  for (const it of items) {
    r -= it.weight;
    if (r <= 0) return it.value;
  }
  return items[items.length - 1].value;
}
