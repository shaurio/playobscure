
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const article = request.nextUrl.searchParams
    .get("article")
    ?.trim();

  if (!article || article.length > 120) {
    return NextResponse.json(
      { error: "Provide a Wikipedia article title." },
      { status: 400 }
    );
  }

  // Use the previous 30 completed UTC days.
  const endDate = new Date();
  endDate.setUTCDate(endDate.getUTCDate() - 1);

  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - 29);

  const formatDate = (date: Date) =>
    date.toISOString().slice(0, 10).replace(/-/g, "");

  const encodedTitle = encodeURIComponent(
    article.replace(/ /g, "_")
  );

  const url =
    "https://wikimedia.org/api/rest_v1/metrics/pageviews/" +
    "per-article/en.wikipedia.org/all-access/user/" +
    `${encodedTitle}/daily/` +
    `${formatDate(startDate)}/${formatDate(endDate)}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "PlayObscure/0.1 (https://playobscure.com)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 86400 },
    });

    if (response.status === 404) {
      return NextResponse.json({
        article,
        found: false,
        reason: "No pageview data for this exact article title.",
      });
    }

    if (!response.ok) {
      throw new Error(`Wikimedia returned ${response.status}`);
    }

    const result = await response.json();

    const daily = (result.items ?? []) as Array<{
      views: number;
    }>;

    const totalViews = daily.reduce(
      (sum, item) => sum + item.views,
      0
    );

    return NextResponse.json({
      article,
      found: true,
      totalViews,
      averageDailyViews: Math.round(
        totalViews / Math.max(1, daily.length)
      ),
      daysMeasured: daily.length,
      period: {
        start: formatDate(startDate),
        end: formatDate(endDate),
      },
      source: "Wikimedia Analytics",
      note:
        "Article popularity is not equivalent to answer obscurity.",
    });
  } catch {
    return NextResponse.json(
      { error: "Wikipedia popularity data unavailable." },
      { status: 502 }
    );
  }
}
