import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" });

  try {
    const client = new Anthropic({ apiKey });
    
    // Try the simplest possible call
    const response = await client.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 10,
      messages: [{ role: "user", content: "Say hello" }],
    });

    return NextResponse.json({
      success: true,
      response: JSON.stringify(response, null, 2).substring(0, 500),
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error_message: error.message,
      error_status: error.status,
      error_type: error.error?.error?.type,
      error_full: JSON.stringify(error.error || error.data || {}, null, 2),
      sdk_version: require("@anthropic-ai/sdk/package.json").version,
      key_length: apiKey.length,
      key_starts_with: apiKey.substring(0, 20),
    });
  }
}
