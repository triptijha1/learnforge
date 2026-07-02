import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createChapterSchema } from "@/validators/course";
import { getUnsplashImage } from "@/lib/unsplash";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { generateCourseStructure } from "@/lib/courseGeneration";
import { uploadImageFromUrl } from "@/lib/storage";
import { rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import { courseQueue } from "@/lib/queue";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

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
      return new NextResponse("unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { title, units } = createChapterSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return new NextResponse("user not found", { status: 404 });
    }

    const outputUnits = await generateCourseStructure(title, units);
    const imageSearchTerm = title;
    const unsplashImage = (await getUnsplashImage(imageSearchTerm)) ?? "";

    const course = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.updateMany({
        where: {
          id: user.id,
          credits: { gt: 0 },
        },
        data: {
          credits: { decrement: 1 },
        },
      });

      if (updatedUser.count === 0) {
        throw new Error("NO_CREDITS");
      }

      const createdCourse = await tx.course.create({
        data: {
          name: title,
          image: unsplashImage,
          userId: user.id,
        },
      });

      for (const unit of outputUnits) {
        const prismaUnit = await tx.unit.create({
          data: {
            name: unit.title,
            courseId: createdCourse.id,
          },
        });

        await tx.chapter.createMany({
          data: unit.chapters.map((chapter) => ({
            name: chapter.chapter_title,
            youtubeSearchQuery: chapter.youtube_search_query,
            unitId: prismaUnit.id,
          })),
        });
      }

      return createdCourse;
    });

    if (unsplashImage && process.env.AWS_S3_BUCKET_NAME) {
      try {
        const filename = slugify(title) || course.id;
        const key = `courses/${course.id}/${filename}.jpg`;
        const uploadedUrl = await uploadImageFromUrl(unsplashImage, key);
        await prisma.course.update({
          where: { id: course.id },
          data: { image: uploadedUrl },
        });
      } catch (err) {
        console.warn("Course image upload failed:", err);
      }
    }

    const chapters = await prisma.chapter.findMany({
      where: { unit: { courseId: course.id } },
      select: { id: true },
    });

    await Promise.all(
      chapters.map((chapter) =>
        courseQueue.add(
          "generate-chapter",
          {
            chapterId: chapter.id,
            language: "EN",
          },
          {
            removeOnComplete: true,
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 1000,
            },
          }
        )
      )
    );

    return NextResponse.json({ course_id: course.id });
  } catch (error) {
    if (error instanceof ZodError) {
      return new NextResponse("invalid body", { status: 400 });
    }

    if (error instanceof Error && error.message === "NO_CREDITS") {
      return new NextResponse("no credits", { status: 402 });
    }

    console.error("[CREATE_CHAPTERS_ERROR]", error);
    return new NextResponse("internal error", { status: 500 });
  }
}
