import "server-only";

import { generateCoursePlan } from "@/lib/ai";
import { prisma } from "@/lib/db";
import { NoCreditsError, NotFoundError } from "@/lib/errors";
import { getUnsplashImage } from "@/lib/unsplash";

type CreateCourseInput = {
  title: string;
  units: string[];
  language: "EN" | "HI";
};

export async function createCourseWithUnits(input: CreateCourseInput, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });
  if (!user || user.credits <= 0) throw new NoCreditsError();

  const [plan, image] = await Promise.all([
    generateCoursePlan(input.title, input.units, input.language),
    getUnsplashImage(input.title),
  ]);
  if (plan.units.length !== input.units.length) {
    throw new Error("AI returned an invalid number of units");
  }

  return prisma.$transaction(async (tx) => {
    const charged = await tx.user.updateMany({
      where: { id: userId, credits: { gt: 0 } },
      data: { credits: { decrement: 1 } },
    });
    if (charged.count !== 1) throw new NoCreditsError();

    return tx.course.create({
      data: {
        name: input.title,
        image,
        userId,
        units: {
          create: plan.units.map((unit) => ({
            name: unit.name,
            chapters: {
              create: unit.chapters.map((chapter) => ({
                name: chapter.name,
                youtubeSearchQuery: chapter.youtubeSearchQuery,
                videoLanguage: input.language,
              })),
            },
          })),
        },
      },
      include: { units: { include: { chapters: true } } },
    });
  }, { maxWait: 10_000, timeout: 20_000 });
}

export function fetchCourses(userId: string) {
  return prisma.course.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { units: { include: { chapters: true } } },
  });
}

export async function fetchCourse(courseId: string, userId: string) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, userId },
    include: {
      units: {
        include: { chapters: { include: { questions: true }, orderBy: { createdAt: "asc" } } },
      },
    },
  });
  if (!course) throw new NotFoundError("Course not found");
  return course;
}

export async function deleteCourse(courseId: string, userId: string) {
  const result = await prisma.course.deleteMany({ where: { id: courseId, userId } });
  if (result.count !== 1) throw new NotFoundError("Course not found");
}
