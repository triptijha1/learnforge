import axios from "axios";

// Access environment in a way that avoids TypeScript errors when Node types aren't available
const processEnv: { [key: string]: string | undefined } =
  typeof process !== "undefined" && (process as any).env ? (process as any).env : (globalThis as any).process?.env || {};

const GEMINI_API_KEY = processEnv.GEMINI_API_KEY;
const GEMINI_MODEL = processEnv.GEMINI_MODEL || "models/gemini-1.5-pro";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta2/${GEMINI_MODEL}:generate`;

if (!GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY is not set. Gemini requests will fail until it is configured.");
}

async function callGemini(
  prompt: string,
  maxOutputTokens = 700,
  temperature = 0.2
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const response = await axios.post(
    `${GEMINI_ENDPOINT}?key=${encodeURIComponent(GEMINI_API_KEY)}`,
    {
      prompt: {
        text: prompt,
      },
      temperature,
      maxOutputTokens,
      topP: 0.9,
      candidateCount: 1,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const candidate = response.data?.candidates?.[0];
  const output = candidate?.output || response.data?.output || "";

  return String(output).trim();
}

function safeJsonParse<T>(value: string): T {
  const trimmed = value.trim();
  try {
    return JSON.parse(trimmed);
  } catch (firstError) {
    const match = trimmed.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (secondError) {
        throw new Error(`Failed to parse JSON response from Gemini: ${secondError}`);
      }
    }
    throw new Error(`Failed to parse JSON response from Gemini: ${firstError}`);
  }
}

export async function generateText(
  prompt: string,
  maxOutputTokens = 700,
  temperature = 0.2
): Promise<string> {
  return await callGemini(prompt, maxOutputTokens, temperature);
}

export async function generateJson<T>(
  prompt: string,
  maxOutputTokens = 700,
  temperature = 0.2
): Promise<T> {
  const raw = await callGemini(prompt, maxOutputTokens, temperature);
  return safeJsonParse<T>(raw);
}

export async function generateStructuredText(
  prompt: string,
  maxOutputTokens = 850,
  temperature = 0.15
): Promise<string> {
  return await callGemini(prompt, maxOutputTokens, temperature);
}
