
import { NextRequest, NextResponse } from "next/server";
import { evaluateAnswer } from "@/lib/answer-engine";
import type { Category } from "@/lib/answers";

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function estimateRarity(views: number) {
  // Experimental calibration:
  // 50,000 monthly views -> obscurity 15
  //    300 monthly views -> obscurity 80
  // These are design choices, not empirical rarity percentiles.

  const highViews = Math.log10(50000);
  const lowViews = Math.log10(300);
  const observed = Math.log10(Math.max(1, views));

  const fraction =
    (highViews - observed) / (highViews - lowViews);

  return Math.round(
    Math.max(5, Math.min(95, 15 + fraction * 65))
  );
}

async function estimateFromWikipedia(title: string) {
  // Avoid querying unknown or excessively long titles.
  if (!title || title.length > 120) return null;

  // Allow two days for Wikimedia's daily reporting.
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 2);

  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 29);

  const encoded = encodeURIComponent(
    title.replace(/ /g, "_")
  );

  const url =
    "https://wikimedia.org/api/rest_v1/metrics/pageviews/" +
    "per-article/en.wikipedia.org/all-access/user/" +
    `${encoded}/daily/` +
    `${formatDate(start)}/${formatDate(end)}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "PlayObscure/0.1 (https://playobscure.com)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 86400 },
    });

    if (!response.ok) return null;

    const payload = await response.json();

    const items = payload.items as
      | { views: number }[]
      | undefined;

    // Do not estimate rarity from very incomplete periods.
    if (!items || items.length < 25) return null;

    const views = items.reduce(
      (total, day) => total + day.views,
      0
    );

    if (!Number.isFinite(views)) return null;

    const rarity = estimateRarity(views);

    return {
      rarity,
      tier: Math.min(5, Math.ceil(rarity / 20)),
      wikipediaArticle: title,
      monthlyViews: views,
      daysMeasured: items.length,
      method: "wikipedia-pageviews-v1",
      estimated: true,
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams
    .get("name")
    ?.trim();

  const category = request.nextUrl.searchParams.get("category");

  if (!name || name.length > 100) {
    return NextResponse.json(
      { error: "Provide an answer between 1 and 100 characters." },
      { status: 400 }
    );
  }

  if (
    category !== "ocean" &&
    category !== "fungi" &&
    category !== "space"
  ) {
    return NextResponse.json(
      { error: "Invalid category." },
      { status: 400 }
    );
  }

  const result = await evaluateAnswer(
    name,
    category as Category
  );

  // Only score recognized, eligible answers.
  if (!result.recognized || result.eligible !== true) {
    return NextResponse.json(result);
  }

  // Keep existing hand-curated scores.
  if (result.rarity !== null) {
    return NextResponse.json(result);
  }

  // For eligible but unrated answers, try their resolved
  // biological name as a Wikipedia article title.
  // A missing article does not mean the answer is invalid.
  const estimate = await estimateFromWikipedia(result.name);

  if (!estimate) {
    return NextResponse.json({
      ...result,
      message:
        "Recognized, but no reliable provisional score is available.",
    });
  }

  return NextResponse.json({
    ...result,
    rarity: estimate.rarity,
    tier: estimate.tier,
    rating: "estimated",
    source: `${result.source}+wikipedia`,
    message:
      "Provisional obscurity estimate based on Wikipedia readership.",
    evidence: estimate,
  });
}
