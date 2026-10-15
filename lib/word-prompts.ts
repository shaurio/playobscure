
import { readFile } from "node:fs/promises";
import path from "node:path";

type WordEntry = {
  word: string;
  length: number;
  first: string;
};

export type WordPrompt = {
  id: string;
  title: string;
  startsWith?: string;
  contains?: string;
  length?: number;
  eligibleCount: number;
};

type Candidate = WordPrompt & {
  family: string;
};

let cachedPool: Promise<Candidate[]> | null = null;

const alphabet = "abcdefghijklmnopqrstuvwxyz";

function makeTemplates() {
  const templates: Omit<Candidate, "eligibleCount">[] = [];

  function add(
    family: string,
    title: string,
    constraints: {
      startsWith?: string;
      contains?: string;
      length?: number;
    }
  ) {
    const id = [
      family,
      constraints.startsWith ?? "",
      constraints.contains ?? "",
      constraints.length ?? "",
    ].join("-");

    templates.push({
      id,
      title,
      family,
      ...constraints,
    });
  }

  for (let length = 4; length <= 12; length++) {
    add(
      "length",
      `Name a ${length}-letter English word`,
      { length }
    );
  }

  for (const letter of alphabet) {
    add(
      "starts",
      `Name a word beginning with ${letter.toUpperCase()}`,
      { startsWith: letter }
    );

    add(
      "contains",
      `Name a word containing ${letter.toUpperCase()}`,
      { contains: letter }
    );

    for (let length = 4; length <= 10; length++) {
      add(
        "length-starts",
        `Name a ${length}-letter word beginning with ${letter.toUpperCase()}`,
        { startsWith: letter, length }
      );

      add(
        "length-contains",
        `Name a ${length}-letter word containing ${letter.toUpperCase()}`,
        { contains: letter, length }
      );
    }
  }

  const commonLetters = "aeiourstln";

  for (const first of alphabet) {
    for (const included of commonLetters) {
      if (first === included) continue;

      add(
        "starts-contains",
        `Name a word beginning with ${first.toUpperCase()} that contains ${included.toUpperCase()}`,
        {
          startsWith: first,
          contains: included,
        }
      );
    }
  }

  return templates;
}

function matches(
  word: WordEntry,
  prompt: Omit<Candidate, "eligibleCount">
) {
  if (prompt.length !== undefined && word.length !== prompt.length) {
    return false;
  }

  if (prompt.startsWith && word.first !== prompt.startsWith) {
    return false;
  }

  if (prompt.contains && !word.word.includes(prompt.contains)) {
    return false;
  }

  return true;
}

async function buildPool(): Promise<Candidate[]> {
  const file = path.join(
    process.cwd(),
    "data",
    "english-words.json"
  );

  const raw = await readFile(file, "utf8");
  const words = JSON.parse(raw) as WordEntry[];

  const templates = makeTemplates();

  return templates.flatMap((template) => {
    const eligibleCount = words.reduce(
      (count, word) => count + Number(matches(word, template)),
      0
    );

    // Avoid impossible or overly restrictive prompts.
    if (eligibleCount < 40 || eligibleCount > 12000) {
      return [];
    }

    return [{ ...template, eligibleCount }];
  });
}

async function getPool() {
  if (!cachedPool) {
    cachedPool = buildPool().catch((error) => {
      cachedPool = null;
      throw error;
    });
  }

  return cachedPool;
}

// Reproducible randomness from a seed.
function seededRandom(seed: string) {
  let state = 2166136261;

  for (let i = 0; i < seed.length; i++) {
    state ^= seed.charCodeAt(i);
    state = Math.imul(state, 16777619);
  }

  return function random() {
    state += 0x6d2b79f5;
    let value = state;

    value = Math.imul(
      value ^ (value >>> 15),
      value | 1
    );

    value ^= value + Math.imul(
      value ^ (value >>> 7),
      value | 61
    );

    return (
      ((value ^ (value >>> 14)) >>> 0) / 4294967296
    );
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

export async function generateWordPrompts(
  seed: string,
  count = 5
) {
  const pool = await getPool();
  const random = seededRandom(seed);

  const families = shuffle(
    [...new Set(pool.map((prompt) => prompt.family))],
    random
  );

  const selected: Candidate[] = [];
  const used = new Set<string>();

  // Favor different styles of questions.
  for (const family of families) {
    if (selected.length >= count) break;

    const options = pool.filter(
      (prompt) => prompt.family === family
    );

    const pick = shuffle(options, random)[0];

    if (pick && !used.has(pick.id)) {
      selected.push(pick);
      used.add(pick.id);
    }
  }

  // Fill any remaining slots without repeating prompts.
  for (const prompt of shuffle(pool, random)) {
    if (selected.length >= count) break;

    if (!used.has(prompt.id)) {
      selected.push(prompt);
      used.add(prompt.id);
    }
  }

  return {
    seed,
    availablePrompts: pool.length,
    prompts: shuffle(selected, random).map(
      ({ family: _family, ...prompt }) => prompt
    ),
  };
}
