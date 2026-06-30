import { prisma } from "@/lib/db";

export async function findChapterById(
  chapterId: string,
  userId: string
) {
  return prisma.chapter.findFirst({
    where: {
      id: chapterId,
      unit: {
        course: {
          userId,
        },
      },
    },
    include: {
      questions: true,
    },
  });
}

export async function updateChapterContent(
  chapterId: string,
  data: {
    contentMarkdown?: string;
    summaryMarkdown?: string;
  }
) {
  return prisma.chapter.update({
    where: { id: chapterId },
    data,
  });
}