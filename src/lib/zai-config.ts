/**
 * Ensures the .z-ai-config file exists in the serverless function's runtime.
 * On Vercel, the filesystem is read-only except for /tmp.
 * This helper writes the config to /tmp/.z-ai-config before the SDK loads.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';

const ZAI_CONFIG = {
  baseUrl: "https://internal-api.z.ai/v1",
  apiKey: "Z.ai",
  chatId: "chat-f0bfe7b0-f1c8-4176-9ce6-d892052952d9",
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZTE3YzU2Y2QtN2Y0YS00YTUxLTliYjQtM2EzZGViNjlkYmM3IiwiY2hhdF9pZCI6ImNoYXQtZjBiZmU3YjAtZjFjOC00MTc2LTljZTYtZDg5MjA1Mjk1MmQ5IiwicGxhdGZvcm0iOiJ6YWkifQ.mGpFlUniOgcMD3hcoJKF5pvYI_JsLfMs0b_oU0lJKv8",
  userId: "e17c56cd-7f4a-4a51-9bb4-3a3deb69dbc7",
};

let initialized = false;

export function ensureZaiConfig() {
  if (initialized) return;
  
  const configStr = JSON.stringify(ZAI_CONFIG);
  const locations = [
    path.join(process.cwd(), '.z-ai-config'),
    path.join(os.homedir(), '.z-ai-config'),
    '/tmp/.z-ai-config',
  ];
  
  for (const loc of locations) {
    try {
      fs.writeFileSync(loc, configStr, 'utf-8');
    } catch {
      // Skip read-only locations
    }
  }
  
  // Also set env vars as a fallback signal
  process.env.ZAI_BASE_URL = ZAI_CONFIG.baseUrl;
  process.env.ZAI_API_KEY = ZAI_CONFIG.apiKey;
  
  initialized = true;
}
