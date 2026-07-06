import { NextResponse } from "next/server";

export async function GET() {
  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  const keyPrefix = process.env.ANTHROPIC_API_KEY?.substring(0, 10) || "not set";
  const model = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022 (default)";

  return NextResponse.json({
    anthropic_key_set: hasKey,
    key_prefix: keyPrefix + "...",
    model,
    timestamp: new Date().toISOString(),
  });
}
