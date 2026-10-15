
import { NextRequest, NextResponse } from "next/server";
import { findCommonName } from "@/lib/common-names";

type GBIFResult = {
  key: number;
  canonicalName?: string;
  scientificName?: string;
  vernacularNames?: Array<{ vernacularName: string }>;
  rank?: string;
  kingdom?: string;
  taxonomicStatus?: string;
};

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name")?.trim();
  const category = request.nextUrl.searchParams.get("category");

  if (!name || name.length > 100) {
    return NextResponse.json(
      { error: "Enter a name between 1 and 100 characters." },
      { status: 400 }
    );
  }

  if (category !== "animal" && category !== "fungi") {
    return NextResponse.json(
      { error: "Category must be animal or fungi." },
      { status: 400 }
    );
  }

  const common = findCommonName(
    name,
    category === "animal" ? "ocean" : "fungi"
  );

  if (common) {
    return NextResponse.json({
      query: name,
      recognized: true,
      name: common.name,
      scientificName: common.scientificName ?? null,
      kingdom: category === "animal" ? "Animalia" : "Fungi",
      confidence: "curated",
      source: "common-names",
    });
  }

  try {
    const url = new URL("https://api.gbif.org/v1/species/search");

    url.searchParams.set("q", name);
    url.searchParams.set("limit", "50");
    url.searchParams.set(
      "datasetKey",
      "d7dddbf4-2cf0-4f39-9b2a-bb099caae36c"
    );

    const response = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      throw new Error("GBIF lookup failed");
    }

    const data = await response.json();
    const expectedKingdom =
      category === "animal" ? "Animalia" : "Fungi";

    const matches = ((data.results ?? []) as GBIFResult[]).filter(
      (item) => {
        if (item.kingdom !== expectedKingdom) return false;

        const names = [
          item.canonicalName,
          ...(item.vernacularNames ?? []).map(
            (v) => v.vernacularName
          ),
        ].filter((v): v is string => Boolean(v));

        return names.some(
          (candidate) => normalize(candidate) === normalize(name)
        );
      }
    );

    if (matches.length === 0) {
      return NextResponse.json({
        query: name,
        recognized: false,
        reason: "No exact taxonomic or common-name match found.",
      });
    }

    const best =
      matches.find(
        (item) => item.taxonomicStatus === "ACCEPTED"
      ) ?? matches[0];

    return NextResponse.json({
      query: name,
      recognized: true,
      name: best.canonicalName ?? name,
      scientificName: best.scientificName ?? null,
      rank: best.rank,
      kingdom: best.kingdom,
      confidence: "exact",
      source: "gbif",
      gbifKey: best.key,
    });
  } catch {
    return NextResponse.json(
      { error: "Validation service temporarily unavailable." },
      { status: 502 }
    );
  }
}
