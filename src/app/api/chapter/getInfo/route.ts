import { prisma } from "@/lib/db";
import { searchYoutube } from "@/lib/youtube";
import { getAuthSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { generateWithOllama } from "@/lib/ollama";

/* -------------------- INPUT SCHEMA -------------------- */
const bodySchema = z.object({
  chapterId: z.string(),
  language: z.enum(["EN", "HI"]).default("EN"),
});

/* -------------------- MCQ TYPE -------------------- */
type MCQ = {
  question: string;
  options: string[];
  answer: string;
};

/* -------------------- PROMPT HELPERS -------------------- */

async function generateContent(topic: string) {
  const prompt = `
You are an expert course instructor.
Write a detailed markdown-formatted chapter on the topic: "${topic}".
Include explanations, examples, and structured headings.
Do not include quizzes or summaries.
`;
  return await generateWithOllama(prompt);
}

async function generateSummary(topic: string) {
  const prompt = `
Create short markdown revision notes summarizing the chapter on "${topic}".
Keep it concise and clear.
`;
  return await generateWithOllama(prompt);
}

async function generateMCQs(topic: string): Promise<MCQ[]> {
  const prompt = `
Generate 5 multiple choice questions on "${topic}".
Return ONLY valid JSON in this format:

[
  {
    "question": "Question text",
    "options": ["A", "B", "C", "D"],
    "answer": "Correct option text"
  }
]

Do not include any extra text outside JSON.
`;

  const raw = await generateWithOllama(prompt);

  try {
    const parsed = JSON.parse(raw);
    return parsed as MCQ[];
  } catch (err) {
    console.error("Failed to parse MCQs JSON:", raw);
    return [];
  }
}

/* -------------------- ROUTE -------------------- */

export async function POST(req: Request) {
  try {
    /* -------------------- AUTH -------------------- */
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    /* -------------------- INPUT -------------------- */
    const body = await req.json();
    const { chapterId, language } = bodySchema.parse(body);

    /* -------------------- FETCH CHAPTER -------------------- */
    const chapter = await prisma.chapter.findFirst({
      where: {
        id: chapterId,
        unit: {
          course: {
            userId: session.user.id,
          },
        },
      },
    });

    if (!chapter) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    /* -------------------- CACHE CHECK -------------------- */
    if (chapter.contentMarkdown && chapter.summaryMarkdown) {
      return NextResponse.json({ success: true, cached: true });
    }

    /* -------------------- YOUTUBE VIDEO -------------------- */
    /* -------------------- YOUTUBE VIDEO -------------------- */
let videoId: string | null = null;

try {
  videoId = await searchYoutube(
    `${chapter.name} ${language === "HI" ? "Hindi" : "English"}`
  );
} catch (err) {
  console.error("YouTube search failed:", err);
}



    /* -------------------- AI GENERATION (OLLAMA) -------------------- */
    const contentMarkdown = await generateContent(chapter.name);
    const summaryMarkdown = await generateSummary(chapter.name);
    const mcqs: MCQ[] = await generateMCQs(chapter.name);

    /* -------------------- SAVE QUESTIONS -------------------- */
    if (mcqs.length > 0) {
      await prisma.question.deleteMany({
        where: { chapterId },
      });

      await prisma.question.createMany({
        data: mcqs.map((q) => ({
          chapterId,
          question: q.question,
          answer: q.answer,
          options: JSON.stringify(q.options),
        })),
      });
    }

    /* -------------------- UPDATE CHAPTER -------------------- */
    await prisma.chapter.update({
      where: { id: chapterId },
      data: {
        youtubeVideoId: videoId,
        videoLanguage: language,
        contentMarkdown,
        summaryMarkdown,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CHAPTER_GET_INFO_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
