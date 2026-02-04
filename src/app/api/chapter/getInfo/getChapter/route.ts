import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth";
import { generateText } from "@/lib/ai";
import { chapterContentPrompt, summaryPrompt } from "@/lib/prompts";

/* -------------------- INPUT SCHEMA -------------------- */

const bodySchema = z.object({
  chapterId: z.string(),
});

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
    });

    if (!chapter) {
      return NextResponse.json(
        { error: "Chapter not found" },
        { status: 404 }
      );
    }

    let contentMarkdown = chapter.contentMarkdown;
    let summaryMarkdown = chapter.summaryMarkdown;
    let needsUpdate = false;

    // 4️⃣ Generate content (ONLY if missing)
    if (!contentMarkdown || contentMarkdown.trim().length === 0) {
      contentMarkdown = await generateText(
        chapterContentPrompt(chapter.name)
      );
      needsUpdate = true;
    }

    // 5️⃣ Generate summary (ONLY if missing)
    if (!summaryMarkdown || summaryMarkdown.trim().length === 0) {
      summaryMarkdown = await generateText(
        summaryPrompt(contentMarkdown ?? "")
      );
      needsUpdate = true;
    }

    // 6️⃣ Save generated fields (ONLY if needed)
    if (needsUpdate) {
      await prisma.chapter.update({
        where: { id: chapter.id },
        data: {
          contentMarkdown,
          summaryMarkdown,
        },
      });
    }

    // 7️⃣ Return chapter with updated content
    return NextResponse.json({
      ...chapter,
      contentMarkdown,
      summaryMarkdown,
    });

  } catch (error) {
    console.error("[GET_CHAPTER_ERROR]", error);

    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
