const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "phi3";

export async function generateWithOllama(prompt: string): Promise<string> {
  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      options: {
        num_predict: 800   // limit output length → prevents long stalls
      }
    }),
  });

  if (!res.ok) {
    throw new Error("Ollama request failed");
  }

  const data = await res.json();
  return data.response;
}
