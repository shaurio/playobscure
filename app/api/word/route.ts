
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";



type WordEntry = {
  word: string;
  length: number;
  first: string;
  last: string;
  frequency: number;
  obscurity: number;
  tier: number;
};

let cachedWords: Map<string, WordEntry> | null = null;

async function getWords() {
  if (cachedWords) return cachedWords;

  const filepath = path.join(
    process.cwd(),
    "data",
    "english-words.json"
  );

  const contents = await readFile(filepath, "utf8");
  const entries = JSON.parse(contents) as WordEntry[];

  cachedWords = new Map(
    entries.map((entry) => [entry.word, entry])
  );

  return cachedWords;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const word = (params.get("word") ?? "").trim().toLowerCase();
  const startsWith = (params.get("startsWith") ?? "").toLowerCase();
  const contains = (params.get("contains") ?? "").toLowerCase();
  const lengthParam = params.get("length");

  if (!/^[a-z]{3,24}$/.test(word)) {
    return NextResponse.json(
      { error: "Enter an English word containing 3–24 letters." },
      { status: 400 }
    );
  }

  if (startsWith && !/^[a-z]$/.test(startsWith)) {
    return NextResponse.json(
      { error: "startsWith must be one letter." },
      { status: 400 }
    );
  }

  if (contains && !/^[a-z]$/.test(contains)) {
    return NextResponse.json(
      { error: "contains must be one letter." },
      { status: 400 }
    );
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

  try {
    const words = await getWords();
    const entry = words.get(word);

    if (!entry) {
      return NextResponse.json({
        recognized: false,
        eligible: null,
        word,
        message:
          "Not in our current vocabulary dataset. No penalty.",
      });
    }

    const checks = {
      startsWith:
        !startsWith || entry.first === startsWith,
      contains:
        !contains || entry.word.includes(contains),
      length:
        requiredLength === null ||
        entry.length === requiredLength,
    };

    const eligible = Object.values(checks).every(Boolean);

    return NextResponse.json({
      recognized: true,
      eligible,
      identity: `word:en:${entry.word}`,
      word: entry.word,
      category: "english",
      rarity: entry.obscurity,
      tier: entry.tier,
      rating: "estimated",
      source: "wordfreq",
      frequency: entry.frequency,
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
