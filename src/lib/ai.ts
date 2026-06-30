import "server-only";

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { requireEnv } from "@/lib/env";

let client: GoogleGenAI | undefined;

function getClient() {
  client ??= new GoogleGenAI({ apiKey: requireEnv("GEMINI_API_KEY") });
  return client;
}

export async function generateStructured<T>(prompt: string, schema: z.ZodType<T>) {
  const response = await getClient().models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    contents: prompt,
    config: {
      temperature: 0.35,
      responseMimeType: "application/json",
      responseJsonSchema: z.toJSONSchema(schema) as Record<string, unknown>,
    },
  });
  const text = response.text?.trim();
  if (!text) throw new Error("Gemini returned an empty response");
  return schema.parse(JSON.parse(text));
}

const coursePlanSchema = z.object({
  units: z.array(z.object({
    name: z.string().min(2).max(100),
    chapters: z.array(z.object({
      name: z.string().min(2).max(120),
      youtubeSearchQuery: z.string().min(3).max(180),
    })).min(2).max(5),
  })),
});

export function generateCoursePlan(title: string, requestedUnits: string[], language: "EN" | "HI") {
  return generateStructured(
    `Create a practical beginner-to-intermediate course plan for "${title}".
The requested units, in exact order, are: ${JSON.stringify(requestedUnits)}.
Return exactly one unit per requested unit and keep its name recognizable. Create 2-5 progressively ordered chapters per unit. Each YouTube query must target a high-quality educational video in ${language === "HI" ? "Hindi" : "English"}.`,
    coursePlanSchema
  );
}

const chapterContentSchema = z.object({
  contentMarkdown: z.string().min(300).max(12000),
  summaryMarkdown: z.string().min(80).max(2500),
  questions: z.array(z.object({
    question: z.string().min(8).max(500),
    answer: z.string().min(1).max(500),
    options: z.array(z.string().min(1).max(500)).length(4),
  })).min(3).max(6),
});

export function generateChapterContent(input: {
  courseName: string;
  unitName: string;
  chapterName: string;
  language: "EN" | "HI";
  transcript?: string;
}) {
  const source = input.transcript
    ? `Use this video transcript as the primary source:\n${input.transcript.slice(0, 14000)}`
    : "No transcript is available. Use reliable educational knowledge and avoid unverifiable claims.";
  return generateStructured(
    `Create learning material for chapter "${input.chapterName}" in unit "${input.unitName}" of course "${input.courseName}". Write in ${input.language === "HI" ? "Hindi; technical terms may also appear in English" : "English"}. The lesson needs Markdown headings, explanations, examples, and key takeaways. The summary must be concise Markdown revision notes. Create four distinct MCQs with four unique options each; every answer must exactly equal one option. ${source}`,
    chapterContentSchema
  );
}
