import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth";
import { generateText } from "@/lib/ai";
import { quizPrompt } from "@/lib/prompts";

const bodySchema = z.object({
  chapterId: z.string(),
});

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { chapterId } = bodySchema.parse(body);

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

    const quizText = await generateText(
      quizPrompt(chapter.name)
    );

    return NextResponse.json({
      quiz: JSON.parse(quizText),
    });

  } catch (error) {
    console.error("QUIZ ERROR:", error);
    return NextResponse.json({ error: "Quiz generation failed" }, { status: 400 });
  }
}
