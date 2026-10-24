export type RarityAnswer = {
  word: string;
  rarity: number;
  prompt: string;
  rarityPercentile?: number | null;
};

export function rarityTheme(score: number) {
  if (score >= 91) return { label: "EXTRAORDINARY", color: "#f4d18a" };
  if (score >= 81) return { label: "OBSCURE", color: "#f4bf61" };
  if (score >= 61) return { label: "DEEP CUT", color: "#bca6fa" };
  if (score >= 41) return { label: "CURIOUS", color: "#77c9cf" };
  if (score >= 21) return { label: "FAMILIAR", color: "#a5d7aa" };
  return { label: "COMMON", color: "#9ca7a3" };
}
