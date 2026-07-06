/**
 * Anthropic Claude client helper.
 *
 * Uses ANTHROPIC_API_KEY environment variable. On Vercel, set this in
 * Project Settings → Environment Variables.
 *
 * Model: claude-3-5-sonnet — fast, capable, cost-effective for narration.
 * Override with ANTHROPIC_MODEL env var if needed.
 */

import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  if (!client) {
    client = new Anthropic({ apiKey });
  }
  return client;
}

/**
 * Call Claude with a system prompt and user message.
 * Returns the text response, or null if the API is unavailable.
 */
export async function callClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 1024
): Promise<string | null> {
  const client = getClient();
  if (!client) {
    console.error("[Claude] ANTHROPIC_API_KEY not set");
    return null;
  }

  try {
    const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    // Extract text from the response content blocks
    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    return text.trim() || null;
  } catch (error: any) {
    console.error("[Claude] API call failed:", error.message);
    return null;
  }
}
