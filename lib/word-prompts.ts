
import { readFile } from "node:fs/promises";
import path from "node:path";

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

// This is our frozen, versioned prompt pool.
// Expanding the vocabulary will not automatically
// change the available daily questions.
const POOL_VERSION = "v1";

let cachedPool: Promise<Candidate[]> | null = null;

async function getPool(): Promise<Candidate[]> {
  if (!cachedPool) {
    const filepath = path.join(
      process.cwd(),
      "data",
      `word-prompt-pool-${POOL_VERSION}.json`
    );

    cachedPool = readFile(filepath, "utf8")
      .then((contents) => {
        const parsed: unknown = JSON.parse(contents);

        if (!Array.isArray(parsed) || parsed.length === 0) {
          throw new Error("Prompt pool is empty or invalid.");
        }

        return parsed as Candidate[];
      })
      .catch((error) => {
        cachedPool = null;
        throw error;
      });
  }

  return cachedPool;
}

// Deterministic random-number generator.
// Identical seed + identical pool = identical results.
function seededRandom(seed: string) {
  let state = 2166136261;

  for (let i = 0; i < seed.length; i++) {
    state ^= seed.charCodeAt(i);
    state = Math.imul(state, 16777619);
  }

  return function random(): number {
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
      ((value ^ (value >>> 14)) >>> 0) /
      4294967296
    );
  };
}

function shuffle<T>(
  items: T[],
  random: () => number
): T[] {
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

  // We favor different challenge styles.
  const families = shuffle(
    [...new Set(pool.map((item) => item.family))],
    random
  );

  const selected: Candidate[] = [];
  const used = new Set<string>();

  for (const family of families) {
    if (selected.length >= count) break;

    const options = pool.filter(
      (item) => item.family === family
    );

    const pick = shuffle(options, random)[0];

    if (pick && !used.has(pick.id)) {
      selected.push(pick);
      used.add(pick.id);
    }
  }

  // Fill any remaining slots using other prompts.
  for (const candidate of shuffle(pool, random)) {
    if (selected.length >= count) break;

    if (!used.has(candidate.id)) {
      selected.push(candidate);
      used.add(candidate.id);
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
