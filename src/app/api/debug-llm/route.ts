import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" });

  const client = new Anthropic({ apiKey });

  // Try multiple model names
  const models = [
    "claude-3-5-sonnet-latest",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-latest",
    "claude-3-haiku-20240307",
    "claude-3-sonnet-20240229",
    "claude-3-opus-20240229",
    "claude-sonnet-4-20250514",
    "claude-3-5-sonnet-20240620",
  ];

  const results = [];

  for (const model of models) {
    try {
      const response = await client.messages.create({
        model,
        max_tokens: 10,
        messages: [{ role: "user", content: "Hi" }],
      });
      const text = response.content
        .filter((b: any) => b.type === "text")
        .map((b: any) => b.text)
        .join("");
      results.push({ model, success: true, response: text.substring(0, 50) });
      break; // Stop on first success
    } catch (e: any) {
      results.push({ model, success: false, error: e.message?.substring(0, 100) });
    }
  }

  return NextResponse.json({ key_set: true, results });
}
