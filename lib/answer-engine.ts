
import { data } from "@/lib/answers";
import type { Category } from "@/lib/answers";
import {
  commonNames,
  normalizeAnswer,
} from "@/lib/common-names";

export type AnswerResult = {
  recognized: boolean;
  eligible: boolean | null;
  name: string;
  category: Category;
  identity: string | null;
  rarity: number | null;
  tier: number | null;
  rating: "curated" | "unrated";
  source: string;
  message: string;
};

type GBIFTaxon = {
  key?: number;
  nubKey?: number;
  acceptedKey?: number;
  canonicalName?: string;
  scientificName?: string;
  kingdom?: string;
  taxonomicStatus?: string;
  rank?: string;
  habitats?: string[];
  vernacularNames?: {
    vernacularName: string;
    language?: string;
  }[];
};

function makeResult(
  name: string,
  category: Category,
  overrides: Partial<AnswerResult>
): AnswerResult {
  return {
    recognized: false,
    eligible: null,
    name,
    category,
    identity: null,
    rarity: null,
    tier: null,
    rating: "unrated",
    source: "none",
    message: "Not recognized yet.",
    ...overrides,
  };
}

export async function evaluateAnswer(
  input: string,
  category: Category
): Promise<AnswerResult> {
  const name = input.trim();
  const normalized = normalizeAnswer(name);

  if (!normalized || name.length > 100) {
    return makeResult(name, category, {
      message: "Enter an answer between 1 and 100 characters.",
    });
  }

  // 1. Our existing scored answer database.
  const curated = data[category].find((entry) =>
    [entry.name, ...(entry.aliases ?? [])].some(
      (alias) => normalizeAnswer(alias) === normalized
    )
  );

  if (curated) {
    return makeResult(curated.name, category, {
      recognized: true,
      eligible: true,
      identity: `${category}:${normalizeAnswer(curated.name)}`,
      rarity: curated.rarity,
      tier: Math.min(5, Math.ceil(curated.rarity / 20)),
      rating: "curated",
      source: "play-obscure",
      message: "Verified in our curated answer bank.",
    });
  }

  // 2. Common-name database.
  if (category !== "space") {
    const common = commonNames.find(
      (entry) =>
        entry.category === category &&
        [entry.name, ...entry.aliases].some(
          (alias) => normalizeAnswer(alias) === normalized
        )
    );

    if (common) {
      return makeResult(common.name, category, {
        recognized: true,
        eligible: true,
        identity: `${category}:${normalizeAnswer(
          common.scientificName ?? common.name
        )}`,
        source: "common-names",
        message:
          "Recognized and category-approved. Obscurity score pending.",
      });
    }
  }

  // 3. Astronomy currently requires our curated dataset.
  if (category === "space") {
    return makeResult(name, category, {
      message: "Not in our astronomy database yet.",
    });
  }

  // 4. GBIF lookup for additional scientific or common names.
  const expectedKingdom =
    category === "fungi" ? "Fungi" : "Animalia";

  const url = new URL("https://api.gbif.org/v1/species/search");
  url.searchParams.set("q", name);
  url.searchParams.set("limit", "100");
  url.searchParams.set(
    "datasetKey",
    "d7dddbf4-2cf0-4f39-9b2a-bb099caae36c"
  );

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      throw new Error(`GBIF returned ${response.status}`);
    }

    const payload = await response.json();

    const matches = ((payload.results ?? []) as GBIFTaxon[])
      .filter((item) => item.kingdom === expectedKingdom)
      .filter((item) => {
        const names = [
          item.canonicalName,
          ...(item.vernacularNames ?? []).map(
            (v) => v.vernacularName
          ),
        ];

        return names.some(
          (candidate) =>
            typeof candidate === "string" &&
            normalizeAnswer(candidate) === normalized
        );
      });

    if (matches.length === 0) {
      return makeResult(name, category, {
        message:
          "No verified exact match yet. This does not mean your answer is wrong.",
      });
    }

    const preferred =
      matches.find(
        (item) =>
          item.taxonomicStatus === "ACCEPTED" &&
          (category === "fungi" ||
            item.habitats?.includes("MARINE"))
      ) ??
      matches.find(
        (item) => item.taxonomicStatus === "ACCEPTED"
      ) ??
      matches[0];

    const marineConfirmed =
      preferred.habitats?.includes("MARINE") ?? false;

    const eligible =
      category === "fungi" ? true : marineConfirmed ? true : null;

    return makeResult(
      preferred.canonicalName ?? name,
      category,
      {
        recognized: true,
        eligible,
        identity: preferred.nubKey || preferred.acceptedKey
          ? `gbif:${preferred.nubKey ?? preferred.acceptedKey}`
          : preferred.key
          ? `gbif:${preferred.key}`
          : `${category}:${normalizeAnswer(preferred.canonicalName ?? name)}`,
        source: "gbif",
        message:
          eligible === true
            ? "Recognized. Obscurity score pending."
            : "Taxon recognized, but marine eligibility isn't confirmed.",
      }
    );
  } catch {
    return makeResult(name, category, {
      source: "unavailable",
      message:
        "Knowledge service temporarily unavailable. Try again shortly.",
    });
  }
}
