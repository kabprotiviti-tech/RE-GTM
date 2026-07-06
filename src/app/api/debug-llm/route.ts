import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function GET() {
  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  const keyPrefix = process.env.ANTHROPIC_API_KEY?.substring(0, 15) || "not set";

  if (!hasKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" });
  }

  // Try an actual Claude call
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

    const response = await client.messages.create({
      model,
      max_tokens: 50,
      system: "You are a helpful assistant. Reply in one word.",
      messages: [{ role: "user", content: "Say hello" }],
    });

    const text = response.content
      .filter((block: any) => block.type === "text")
      .map((block: any) => block.text)
      .join("");

    return NextResponse.json({
      anthropic_key_set: true,
      key_prefix: keyPrefix + "...",
      model,
      claude_response: text,
      success: true,
    });
  } catch (error: any) {
    return NextResponse.json({
      anthropic_key_set: true,
      key_prefix: keyPrefix + "...",
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      success: false,
      error: error.message,
      error_type: error.constructor.name,
      status: error.status || "N/A",
    });
  }
}
