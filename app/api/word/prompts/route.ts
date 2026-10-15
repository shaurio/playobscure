
import { NextRequest, NextResponse } from "next/server";
import { generateWordPrompts } from "@/lib/word-prompts";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const seed = params.get("seed") ?? "preview-1";
  const count = Number(params.get("count") ?? "5");

  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(seed)) {
    return NextResponse.json(
      { error: "Invalid seed." },
      { status: 400 }
    );
  }

  if (!Number.isInteger(count) || count < 1 || count > 10) {
    return NextResponse.json(
      { error: "Count must be between 1 and 10." },
      { status: 400 }
    );
  }

  try {
    return NextResponse.json(
      await generateWordPrompts(seed, count)
    );
  } catch (error) {
    console.error("Prompt generation failed:", error);

    return NextResponse.json(
      { error: "Could not generate prompts." },
      { status: 500 }
    );
  }
}
