/** GA4 gameplay events. Never send submitted words, free text, or identifiers. */
export type GameMode = "words" | "daily" | "arcade";
type GAValue = string | number | boolean;

declare global {
  interface Window {
    gtag?: (...args: [string, string, Record<string, GAValue>]) => void;
  }
}

export function trackGameEvent(
  event: "game_start" | "answer_accepted" | "answer_rejected" |
    "game_complete" | "replay_start" | "result_share",
  mode: GameMode,
  details: Record<string, GAValue> = {}
) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", event, { game_mode: mode, ...details });
}
