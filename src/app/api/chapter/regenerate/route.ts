import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth";
import { generateText } from "@/lib/ai";
import { chapterContentPrompt, summaryPrompt } from "@/lib/prompts";

const bodySchema = z.object({
  chapterId: z.string(),
  type: z.enum(["content", "summary"]),
});

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { chapterId, type } = bodySchema.parse(body);

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

    if (type === "content") {
      const contentMarkdown = await generateText(
        chapterContentPrompt(chapter.name)
      );

      await prisma.chapter.update({
        where: { id: chapter.id },
        data: { contentMarkdown },
      });

      return NextResponse.json({ contentMarkdown });
    }

    const summaryMarkdown = await generateText(
      summaryPrompt(chapter.contentMarkdown!)
    );

    await prisma.chapter.update({
      where: { id: chapter.id },
      data: { summaryMarkdown },
    });

    return NextResponse.json({ summaryMarkdown });

  } catch (error) {
    console.error("REGENERATE ERROR:", error);
    return NextResponse.json({ error: "Regeneration failed" }, { status: 400 });
  }
}
