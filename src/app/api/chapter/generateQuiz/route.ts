import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth";
import { generateText } from "@/lib/ai";
import { quizPrompt } from "@/lib/prompts";

/* -------------------- INPUT SCHEMA -------------------- */

const bodySchema = z.object({
  chapterId: z.string(),
});

/* -------------------- TYPES -------------------- */

type MCQ = {
  question: string;
  options: string[];
  answer: string;
};

/* -------------------- ROUTE -------------------- */

export async function POST(req: Request) {
  try {
    // 1️⃣ Auth
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 2️⃣ Validate body
    const body = await req.json();
    const { chapterId } = bodySchema.parse(body);

    // 3️⃣ Fetch chapter with ownership check
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
      return new NextResponse("Chapter not found", { status: 404 });
    }

    // 4️⃣ Return cached quiz if exists
    if (chapter.questions.length > 0) {
      return NextResponse.json({ quiz: chapter.questions });
    }

    // 5️⃣ Generate quiz with Gemini
    const raw = await generateText(
      quizPrompt(chapter.name)
    );

    let mcqs: MCQ[] = [];

    try {
      mcqs = JSON.parse(raw);
    } catch {
      return new NextResponse("Invalid quiz generation", { status: 500 });
    }

    if (!Array.isArray(mcqs) || mcqs.length === 0) {
      return new NextResponse("Quiz generation failed", { status: 500 });
    }

    // 6️⃣ Save quiz
    await prisma.question.createMany({
      data: mcqs.map((q) => ({
        chapterId: chapter.id,
        question: q.question,
        answer: q.answer,
        options: JSON.stringify(q.options),
      })),
    });

    // 7️⃣ Return quiz
    return NextResponse.json({ quiz: mcqs });

  } catch (error) {
    console.error("[GENERATE_QUIZ_ERROR]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
