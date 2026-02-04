import { gemini } from "./gemini";

export async function generateText(prompt: string) {
  const result = await gemini.generateContent(prompt);
  return result.response.text();
}
