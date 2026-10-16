// Scoring is relative to the words allowed by the current prompt.
// Unknown (zero) frequencies are not treated as perfectly rare.

export type WordConstraints = {
  startsWith?: string;
  endsWith?: string;
  contains?: string;
  length?: number | null;
};

export type FrequencyBounds = {
  lower: number;
  upper: number;
  knownCount: number;
  eligibleCount: number;
};

export function constraintKey(constraints: WordConstraints): string {
  return [
    constraints.startsWith ?? "",
    constraints.endsWith ?? "",
    constraints.contains ?? "",
    constraints.length ?? "",
  ].join("|");
}

export function matchesWord(
  word: string,
  constraints: WordConstraints
): boolean {
  return (
    (!constraints.startsWith || word.startsWith(constraints.startsWith)) &&
    (!constraints.endsWith || word.endsWith(constraints.endsWith)) &&
    (!constraints.contains || word.includes(constraints.contains)) &&
    (constraints.length === undefined ||
      constraints.length === null || word.length === constraints.length)
  );
}

function quantile(sorted: number[], percentile: number): number {
  const position = (sorted.length - 1) * percentile;
  const before = Math.floor(position);
  const after = Math.min(before + 1, sorted.length - 1);
  const fraction = position - before;
  return sorted[before] * (1 - fraction) + sorted[after] * fraction;
}

// Used only for conditions not covered by the precomputed prompt pool.
export function calculateBounds(
  words: Iterable<{ word: string; frequency: number }>,
  constraints: WordConstraints
): FrequencyBounds | null {
  const frequencies: number[] = [];
  let eligibleCount = 0;

  for (const entry of words) {
    if (!matchesWord(entry.word, constraints)) continue;
    eligibleCount++;
    if (entry.frequency > 0 && Number.isFinite(entry.frequency)) {
      frequencies.push(entry.frequency);
    }
  }

  if (frequencies.length < 2) return null;
  frequencies.sort((a, b) => a - b);

  const lower = quantile(frequencies, 0.05);
  const upper = quantile(frequencies, 0.95);
  if (upper <= lower) return null;

  return { lower, upper, knownCount: frequencies.length, eligibleCount };
}

export function relativeRarity(
  frequency: number,
  bounds: FrequencyBounds
): number | null {
  if (!Number.isFinite(frequency) || frequency <= 0) return null;
  if (bounds.upper <= bounds.lower) return null;

  return Math.round(
    Math.max(1, Math.min(100,
      1 + 99 * (bounds.upper - frequency) / (bounds.upper - bounds.lower)
    ))
  );
}

export function rarityTier(rarity: number): number {
  return Math.min(5, Math.max(1, Math.floor((rarity - 1) / 20) + 1));
}
