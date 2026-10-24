/** Trigger when an answer's validated rarity score is revealed (0–100). */
export const RARITY_ATMOSPHERE_EVENT = 'playobscure:rarity-reveal';

export type RarityAtmosphereDetail = { score: number };

export function emitRarityScore(score: number) {
  if (typeof window === 'undefined' || !Number.isFinite(score)) return;
  window.dispatchEvent(
    new CustomEvent<RarityAtmosphereDetail>(RARITY_ATMOSPHERE_EVENT, {
      detail: { score },
    })
  );
}
