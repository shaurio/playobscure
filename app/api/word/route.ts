import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  calculateBounds,
  constraintKey,
  rarityTier,
  relativeRarity,
  type FrequencyBounds,
  type WordConstraints,
} from "@/lib/word-rarity";

type WordEntry = {
  word: string;
  length: number;
  first: string;
  last: string;
  frequency: number;
  obscurity: number;
  tier: number;
};

type BoundsFile = {
  distributions: Record<string, FrequencyBounds>;
};

let cachedWords: Map<string, WordEntry> | null = null;
let cachedBounds: Promise<Map<string, FrequencyBounds>> | null = null;
const dynamicBounds = new Map<string, FrequencyBounds | null>();
const percentileFrequencies = new Map<string, number[]>();

// Percentage of eligible words with a higher (more common) Zipf frequency.
// Equal-frequency words do not count as rarer. Unknown frequencies are excluded.
function rarityPercentile(words: Map<string, WordEntry>, constraints: WordConstraints, frequency: number): number | null {
  if (!(frequency > 0) || !Number.isFinite(frequency)) return null;
  const key = constraintKey(constraints);
  let sorted = percentileFrequencies.get(key);
  if (!sorted) {
    sorted = [];
    for (const entry of words.values()) {
      if (entry.frequency > 0 && Number.isFinite(entry.frequency) &&
          (!constraints.startsWith || entry.first === constraints.startsWith) &&
          (!constraints.endsWith || entry.last === constraints.endsWith) &&
          (!constraints.contains || entry.word.includes(constraints.contains)) &&
          (constraints.length == null || entry.length === constraints.length)) {
        sorted.push(entry.frequency);
      }
    }
    sorted.sort((a, b) => a - b);
    percentileFrequencies.set(key, sorted);
  }
  if (!sorted.length) return null;
  // Upper bound: first value strictly greater than this word's frequency.
  let low = 0, high = sorted.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (sorted[mid] <= frequency) low = mid + 1;
    else high = mid;
  }
  return Math.round(100 * (sorted.length - low) / sorted.length);
}

async function getWords() {
  if (cachedWords) return cachedWords;

  const filepath = path.join(process.cwd(), "data", "english-words.json");
  const contents = await readFile(filepath, "utf8");
  const entries = JSON.parse(contents) as WordEntry[];

  cachedWords = new Map(entries.map((entry) => [entry.word, entry]));
  return cachedWords;
}

async function getPrecomputedBounds() {
  if (!cachedBounds) {
    const filepath = path.join(process.cwd(), "data", "word-rarity-bounds-v1.json");
    cachedBounds = readFile(filepath, "utf8")
      .then((contents) => {
        const parsed = JSON.parse(contents) as BoundsFile;
        return new Map(Object.entries(parsed.distributions));
      })
      .catch((error) => {
        cachedBounds = null;
        throw error;
      });
  }
  return cachedBounds;
}

async function getFrequencyBounds(
  words: Map<string, WordEntry>,
  constraints: WordConstraints
): Promise<FrequencyBounds | null> {
  const key = constraintKey(constraints);
  const precomputed = (await getPrecomputedBounds()).get(key);
  if (precomputed) return precomputed;

  // This handles future prompt variants (including an ending-letter rule)
  // without scanning the entire vocabulary on every submission.
  if (!dynamicBounds.has(key)) {
    dynamicBounds.set(key, calculateBounds(words.values(), constraints));
  }
  return dynamicBounds.get(key) ?? null;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const word = (params.get("word") ?? "").trim().toLowerCase();
  const startsWith = (params.get("startsWith") ?? "").toLowerCase();
  const endsWith = (params.get("endsWith") ?? "").toLowerCase();
  const contains = (params.get("contains") ?? "").toLowerCase();
  const lengthParam = params.get("length");

  if (!/^[a-z]{3,24}$/.test(word)) {
    return NextResponse.json(
      { error: "Enter an English word containing 3–24 letters." },
      { status: 400 }
    );
  }

  for (const [key, value] of Object.entries({ startsWith, endsWith, contains })) {
    if (value && !/^[a-z]$/.test(value)) {
      return NextResponse.json(
        { error: `${key} must be one letter.` },
        { status: 400 }
      );
    }
  }

  let requiredLength: number | null = null;
  if (lengthParam !== null) {
    const parsed = Number(lengthParam);
    if (!Number.isInteger(parsed) || parsed < 3 || parsed > 24) {
      return NextResponse.json(
        { error: "length must be an integer from 3 to 24." },
        { status: 400 }
      );
    }
    requiredLength = parsed;
  }

  const constraints: WordConstraints = {
    startsWith,
    endsWith,
    contains,
    length: requiredLength,
  };

  try {
    const words = await getWords();
    const entry = words.get(word);

    if (!entry) {
      return NextResponse.json({
        recognized: false,
        eligible: null,
        word,
        message: "Not in our current vocabulary dataset. No penalty.",
      });
    }

    const checks = {
      startsWith: !startsWith || entry.first === startsWith,
      endsWith: !endsWith || entry.last === endsWith,
      contains: !contains || entry.word.includes(contains),
      length: requiredLength === null || entry.length === requiredLength,
    };
    const eligible = Object.values(checks).every(Boolean);

    // Invalid answers get no relative score. A missing frequency estimate
    // keeps the existing provisional score of 85 rather than being mapped to 100.
    let rarity = entry.obscurity;
    let rarityMethod = "global-ineligible";

    if (eligible) {
      if (entry.frequency <= 0) {
        rarityMethod = "frequency-unavailable";
      } else {
        const bounds = await getFrequencyBounds(words, constraints);
        const relative = bounds ? relativeRarity(entry.frequency, bounds) : null;
        if (relative !== null) {
          rarity = relative;
          rarityMethod = "prompt-relative-v1";
        } else {
          rarityMethod = "global-fallback";
        }
      }
    }

    return NextResponse.json({
      recognized: true,
      eligible,
      identity: `word:en:${entry.word}`,
      word: entry.word,
      category: "english",
      rarity,
      tier: rarityTier(rarity),
      rating: "estimated",
      source: "wordfreq",
      frequency: entry.frequency,
      rarityMethod,
      rarityPercentile: eligible ? rarityPercentile(words, constraints, entry.frequency) : null,
      checks,
      message: eligible
        ? "Valid answer! All constraints satisfied."
        : "Recognized word, but it doesn't satisfy the challenge.",
    });
  } catch (error) {
    console.error("Word lookup failed:", error);
    return NextResponse.json(
      { error: "Vocabulary database unavailable." },
      { status: 500 }
    );
  }
}
