import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not defined");
}

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY
);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

export async function generateText(prompt: string) {
  try {
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 800, // 🔥 HARD TOKEN LIMIT
        temperature: 0.7,
      },
    });

    return result.response.text();
  } catch (error) {
    console.error("AI_GENERATION_ERROR:", error);
    throw new Error("AI generation failed");
  }
}