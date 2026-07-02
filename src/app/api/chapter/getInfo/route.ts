import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { courseQueue, courseQueueEvents } from "@/lib/queue";
import { rateLimit, rateLimitHeaders } from "@/lib/rateLimit";

const bodySchema = z.object({
  chapterId: z.string(),
  language: z.enum(["EN", "HI"]).default("EN"),
});

export async function POST(req: Request) {
  const limit = await rateLimit(req);
  if (!limit.success) {
    return new NextResponse("Too many requests", {
      status: 429,
      headers: rateLimitHeaders(limit),
    });
  }

  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { chapterId, language } = bodySchema.parse(body);

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

    if (chapter.contentMarkdown && chapter.summaryMarkdown) {
      return NextResponse.json({ success: true, cached: true });
    }

    const job = await courseQueue.add(
      "generate-chapter",
      { chapterId, language },
      {
        removeOnComplete: true,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
      }
    );

    await courseQueueEvents.waitUntilReady();
    try {
      await job.waitUntilFinished(courseQueueEvents);
    } catch (error) {
      console.error("[QUEUE_JOB_FAILED]", error);
      return NextResponse.json(
        { error: "Chapter generation failed" },
        { status: 500 }
      );
    }

    const updatedChapter = await prisma.chapter.findUnique({ where: { id: chapterId } });

    return NextResponse.json({
      success: true,
      youtubeVideoId: updatedChapter?.youtubeVideoId ?? null,
    });
  } catch (error) {
    console.error("[CHAPTER_GET_INFO_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
