import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth";

const bodySchema = z.object({
  chapterId: z.string(),
});

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return new NextResponse("unauthorized", { status: 401 });
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
      include: {
        questions: true,
      },
    });

    if (!chapter) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: chapter.id,
      name: chapter.name,
      youtubeVideoId: chapter.youtubeVideoId,
      videoLanguage: chapter.videoLanguage,
      content: chapter.contentMarkdown ?? "",
      summary: chapter.summaryMarkdown ?? "",
      questions: chapter.questions,
    });
  } catch (err) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
