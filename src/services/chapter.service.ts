import "server-only";

import { generateChapterContent } from "@/lib/ai";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { getYoutubeTranscript, searchYoutube } from "@/lib/youtube";

export async function enrichChapter(chapterId: string, userId: string) {
  const chapter = await prisma.chapter.findFirst({
    where: { id: chapterId, unit: { course: { userId } } },
    include: { unit: { include: { course: true } }, questions: true },
  });
  if (!chapter) throw new NotFoundError("Chapter not found");

  if (
    chapter.youtubeVideoId &&
    chapter.contentMarkdown &&
    chapter.summaryMarkdown &&
    chapter.questions.length > 0
  ) {
    return chapter;
  }

  const recommendation = await searchYoutube(
    chapter.youtubeSearchQuery,
    chapter.videoLanguage
  );
  const transcript = recommendation
    ? await getYoutubeTranscript(recommendation.videoId)
    : undefined;
  const generated = await generateChapterContent({
    courseName: chapter.unit.course.name,
    unitName: chapter.unit.name,
    chapterName: chapter.name,
    language: chapter.videoLanguage,
    transcript,
  });

  return prisma.$transaction(async (tx) => {
    await tx.question.deleteMany({ where: { chapterId } });
    await tx.question.createMany({
      data: generated.questions.map((question) => ({
        chapterId,
        question: question.question,
        answer: question.answer,
        options: question.options,
      })),
    });
    return tx.chapter.update({
      where: { id: chapterId },
      data: {
        youtubeVideoId: recommendation?.videoId,
        contentMarkdown: generated.contentMarkdown,
        summaryMarkdown: generated.summaryMarkdown,
      },
      include: { questions: true },
    });
  }, { maxWait: 10_000, timeout: 20_000 });
}
