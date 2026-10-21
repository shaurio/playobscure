import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const word = request.nextUrl.searchParams.get("word")?.trim().toLowerCase() ?? "";
  if (!/^[a-z]{2,30}$/.test(word)) return NextResponse.json({ definition: null }, { status: 400 });
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, {
      signal: AbortSignal.timeout(3500), next: { revalidate: 86400 },
    });
    if (!response.ok) return NextResponse.json({ definition: null });
    const entries = await response.json();
    const meaning = entries?.[0]?.meanings?.find((m: { definitions?: {definition?: string}[] }) => m.definitions?.[0]?.definition);
    const definition = meaning?.definitions?.[0]?.definition;
    return NextResponse.json({ definition: typeof definition === "string" ? definition.slice(0, 260) : null });
  } catch {
    return NextResponse.json({ definition: null });
  }
}
