
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name")?.trim();

  if (!name || name.length > 100) {
    return NextResponse.json(
      { error: "Provide a valid name under 100 characters." },
      { status: 400 }
    );
  }

  try {
    const url = new URL("https://api.gbif.org/v1/species/search");
    url.searchParams.set("q", name);
    url.searchParams.set("limit", "10");
    url.searchParams.set("datasetKey", "d7dddbf4-2cf0-4f39-9b2a-bb099caae36c");

    const response = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      throw new Error("GBIF request failed");
    }

    const data = await response.json();

    const results = (data.results ?? []).map(
      (item: {
        key: number;
        scientificName?: string;
        canonicalName?: string;
        rank?: string;
        kingdom?: string;
        family?: string;
      }) => ({
        id: item.key,
        scientificName: item.scientificName,
        canonicalName: item.canonicalName,
        rank: item.rank,
        kingdom: item.kingdom,
        family: item.family,
      })
    );

    return NextResponse.json({ query: name, results });
  } catch {
    return NextResponse.json(
      { error: "Species lookup temporarily unavailable." },
      { status: 502 }
    );
  }
}
