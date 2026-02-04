import { prisma } from "@/lib/db";
import { searchYoutube } from "@/lib/youtube";
import { getAuthSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { generateText } from "@/lib/ai";
import {
  chapterContentPrompt,
  summaryPrompt,
  quizPrompt,
} from "@/lib/prompts";

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
  explanation?: string;
};

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
      return NextResponse.json(
        { error: "Chapter not found" },
        { status: 404 }
      );
    }

    /* -------------------- CACHE CHECK -------------------- */
    if (chapter.contentMarkdown && chapter.summaryMarkdown) {
      return NextResponse.json({ success: true, cached: true });
    }

    /* -------------------- YOUTUBE VIDEO -------------------- */
    let videoId: string | null = null;

    try {
      videoId = await searchYoutube(
        `${chapter.name} ${language === "HI" ? "Hindi" : "English"}`
      );
    } catch (err) {
      console.error("YouTube search failed:", err);
    }

    /* -------------------- AI GENERATION (GEMINI) -------------------- */

    // 1️⃣ Chapter content
    const contentMarkdown = await generateText(
      chapterContentPrompt(chapter.name)
    );

    // 2️⃣ Summary
    const summaryMarkdown = await generateText(
      summaryPrompt(contentMarkdown)
    );

    // 3️⃣ Quiz
    let mcqs: MCQ[] = [];
    try {
      const quizRaw = await generateText(
        quizPrompt(chapter.name)
      );
      mcqs = JSON.parse(quizRaw);
    } catch (err) {
      console.error("Failed to parse MCQs JSON");
    }

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
