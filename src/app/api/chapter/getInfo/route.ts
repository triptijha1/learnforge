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
      include: {
        questions: true,
      },
    });

    if (!chapter) {
      return NextResponse.json(
        { error: "Chapter not found" },
        { status: 404 }
      );
    }

    let contentMarkdown = chapter.contentMarkdown;
    let summaryMarkdown = chapter.summaryMarkdown;
    let youtubeVideoId = chapter.youtubeVideoId;
    let needsUpdate = false;

    /* -------------------- YOUTUBE VIDEO (ONLY IF MISSING) -------------------- */
    if (!youtubeVideoId) {
      try {
        youtubeVideoId = await searchYoutube(
          `${chapter.name} ${language === "HI" ? "Hindi" : "English"}`
        );
        needsUpdate = true;
      } catch (err) {
        console.error("YouTube search failed:", err);
      }
    }

    /* -------------------- CONTENT (ONLY IF MISSING) -------------------- */
    if (!contentMarkdown || contentMarkdown.trim().length === 0) {
      contentMarkdown = await generateText(
        chapterContentPrompt(chapter.name)
      );
      needsUpdate = true;
    }

    /* -------------------- SUMMARY (ONLY IF MISSING) -------------------- */
    if (!summaryMarkdown || summaryMarkdown.trim().length === 0) {
      summaryMarkdown = await generateText(
        summaryPrompt(contentMarkdown ?? "")
      );
      needsUpdate = true;
    }

    /* -------------------- QUIZ (ONLY IF MISSING) -------------------- */
    if (chapter.questions.length === 0) {
      try {
        const quizRaw = await generateText(
          quizPrompt(chapter.name)
        );

        const mcqs: MCQ[] = JSON.parse(quizRaw);

        if (Array.isArray(mcqs) && mcqs.length > 0) {
          await prisma.question.createMany({
            data: mcqs.map((q) => ({
              chapterId,
              question: q.question,
              answer: q.answer,
              options: JSON.stringify(q.options),
            })),
          });
        }
      } catch (err) {
        console.error("Failed to generate or parse MCQs");
      }
    }

    /* -------------------- UPDATE CHAPTER (ONLY IF NEEDED) -------------------- */
    if (needsUpdate) {
      await prisma.chapter.update({
        where: { id: chapterId },
        data: {
          youtubeVideoId,
          videoLanguage: language,
          contentMarkdown,
          summaryMarkdown,
        },
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("[CHAPTER_GET_INFO_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
