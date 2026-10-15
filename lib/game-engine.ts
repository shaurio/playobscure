
import type { Category } from "@/lib/answers";
import type { AnswerResult } from "@/lib/answer-engine";

export type Mode =
  | "iceberg"
  | "climb"
  | "vault"
  | "extinction"
  | "roulette"
  | "collector";

export type Discovery = {
  identity: string;
  name: string;
  category: Category;
  rarity: number;
  tier: number;
  estimated: boolean;
};

export type Game = {
  mode: Mode;
  category: Category;
  round: number;
  score: number;
  discoveries: Discovery[];
  excluded: number[];
  previous: number;
  lives: number;
  swaps: number;
  pending: Discovery | null;
  seconds: number;
  finished: boolean;
};

export const categoryNames: Record<Category, string> = {
  ocean: "Marine Life",
  fungi: "Fungi & Mushrooms",
  space: "Solar System Objects",
};

export const modes: {
  id: Mode;
  name: string;
  icon: string;
  description: string;
}[] = [
  {
    id: "iceberg",
    name: "The Iceberg",
    icon: "🧊",
    description: "Descend through five increasingly obscure depths.",
  },
  {
    id: "climb",
    name: "Rarity Climb",
    icon: "📈",
    description: "Every answer must be rarer than the last.",
  },
  {
    id: "vault",
    name: "Obscurity Vault",
    icon: "💎",
    description: "Fill five slots with rare answers. Two rerolls.",
  },
  {
    id: "extinction",
    name: "Extinction",
    icon: "☠️",
    description: "Every discovery eliminates an entire rarity tier.",
  },
  {
    id: "roulette",
    name: "Obscure Roulette",
    icon: "🎲",
    description: "Five changing challenges. Three lives.",
  },
  {
    id: "collector",
    name: "The Collector",
    icon: "🗃️",
    description: "Collect as many answers as possible in 90 seconds.",
  },
];

export const rouletteCategories: Category[] = [
  "ocean", "fungi", "space", "ocean", "fungi",
];

export const rouletteTiers = [1, 2, 3, 4, 5];

export function createGame(mode: Mode, category: Category): Game {
  return {
    mode,
    category,
    round: 0,
    score: 0,
    discoveries: [],
    excluded: [],
    previous: 0,
    lives: 3,
    swaps: 2,
    pending: null,
    seconds: 90,
    finished: false,
  };
}

export function currentCategory(game: Game): Category {
  return game.mode === "roulette"
    ? rouletteCategories[Math.min(game.round, 4)]
    : game.category;
}

export function requirement(game: Game): number {
  if (game.mode === "iceberg") return game.round + 1;
  if (game.mode === "roulette")
    return rouletteTiers[Math.min(game.round, 4)];
  return 1;
}

export type Evaluation = {
  game: Game;
  message: string;
  success: boolean;
};

export function applyAnswer(
  game: Game,
  result: AnswerResult
): Evaluation {
  const fail = (message: string, updated = game): Evaluation => ({
    game: updated,
    message,
    success: false,
  });

  const pass = (updated: Game, message: string): Evaluation => ({
    game: updated,
    message,
    success: true,
  });

  if (game.finished) return fail("This run has ended.");
  if (game.pending) return fail("Resolve your vault selection first.");

  if (!result.recognized) {
    return fail(result.message || "Answer not recognized yet. No penalty.");
  }

  if (result.eligible !== true) {
    return fail(
      result.eligible === false
        ? "That answer does not qualify for this category."
        : "Recognized, but category eligibility is not verified. No penalty."
    );
  }

  if (result.rarity === null || result.tier === null) {
    return fail(
      `${result.name} is recognized, but its obscurity score is unavailable. No penalty.`
    );
  }

  const discovery: Discovery = {
    identity: result.identity ??
      `${result.category}:${result.name.toLowerCase()}`,
    name: result.name,
    category: result.category,
    rarity: result.rarity,
    tier: result.tier,
    estimated: result.rating !== "curated",
  };

  if (game.discoveries.some(
    (d) => d.identity === discovery.identity ||
      (d.category === discovery.category &&
        d.name.toLowerCase() === discovery.name.toLowerCase())
  )) {
    return fail("Already discovered! Try something different.");
  }

  const note = `${discovery.name} · ${discovery.rarity}/100 · Tier ${discovery.tier}` +
    (discovery.estimated ? " (estimated)" : "");

  const add = (extra: Partial<Game> = {}): Game => ({
    ...game,
    discoveries: [...game.discoveries, discovery],
    score: game.score + discovery.rarity,
    ...extra,
  });

  switch (game.mode) {
    case "iceberg": {
      const needed = requirement(game);
      if (discovery.tier < needed) {
        return fail(`${note}. You need Tier ${needed} or higher.`);
      }
      const next = game.round + 1;
      return pass(
        add({ round: next, finished: next === 5 }),
        `${note}. Depth cleared!`
      );
    }

    case "climb": {
      if (discovery.rarity <= game.previous) {
        return fail(
          `${note}. Your answer must score above ${game.previous}.`
        );
      }
      return pass(
        add({
          previous: discovery.rarity,
          round: game.round + 1,
          finished: discovery.rarity >= 100,
        }),
        `${note}. You've climbed higher!`
      );
    }

    case "vault":
      return pass(
        { ...game, pending: discovery },
        `${note}. Lock it in or spend a reroll.`
      );

    case "extinction": {
      if (game.excluded.includes(discovery.tier)) {
        return fail(`${note}. Tier ${discovery.tier} is extinct!`);
      }
      const excluded = [...game.excluded, discovery.tier];
      return pass(
        add({
          excluded,
          round: excluded.length,
          finished: excluded.length === 5,
        }),
        `${note}. Tier ${discovery.tier} is now extinct!`
      );
    }

    case "roulette": {
      const needed = requirement(game);
      if (discovery.tier < needed) {
        const lives = game.lives - 1;
        return fail(
          `${note}. Tier ${needed}+ required. One life lost.`,
          { ...game, lives, finished: lives <= 0 }
        );
      }
      const next = game.round + 1;
      return pass(
        add({ round: next, finished: next === 5 }),
        `${note}. Round cleared!`
      );
    }

    case "collector":
      return pass(
        add({ round: game.round + 1 }),
        `${note}. Discovery collected!`
      );
  }
}

export function resolveVault(game: Game, keep: boolean): Game {
  if (game.mode !== "vault" || !game.pending) return game;

  if (!keep) {
    if (game.swaps <= 0) return game;
    return {
      ...game,
      pending: null,
      swaps: game.swaps - 1,
    };
  }

  const next = game.round + 1;
  return {
    ...game,
    round: next,
    score: game.score + game.pending.rarity,
    discoveries: [...game.discoveries, game.pending],
    pending: null,
    finished: next === 5,
  };
}
