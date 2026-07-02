import { Queue, Worker, Job, QueueEvents } from "bullmq";
import Redis from "ioredis";
import { prisma } from "./db";
import { generateChapterDetails } from "./courseGeneration";
import { searchYoutube } from "./youtube";

export const connection = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
export const courseQueue = new Queue("course-generation", { connection });
export const courseQueueEvents = new QueueEvents("course-generation", { connection });

courseQueueEvents.waitUntilReady().catch((err) => {
  console.error("[COURSE_QUEUE_EVENTS_ERROR]", err);
});

export const courseWorker = new Worker(
  "course-generation",
  async (job: Job) => {
    const { chapterId, language } = job.data as {
      chapterId: string;
      language: "EN" | "HI";
    };

    const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } });
    if (!chapter) {
      throw new Error("Chapter not found");
    }

    const youtubeVideoId = await searchYoutube(
      `${chapter.youtubeSearchQuery} ${language === "HI" ? "Hindi" : "English"}`,
      language
    );

    const [contentMarkdown, summaryMarkdown, mcqs] = await Promise.all([
      generateChapterDetails(
        chapter.name,
        chapter.youtubeSearchQuery,
        language,
        "content",
        youtubeVideoId ?? undefined
      ),
      generateChapterDetails(
        chapter.name,
        chapter.youtubeSearchQuery,
        language,
        "summary",
        youtubeVideoId ?? undefined
      ),
      generateChapterDetails(
        chapter.name,
        chapter.youtubeSearchQuery,
        language,
        "questions",
        youtubeVideoId ?? undefined
      ),
    ]);

    if (mcqs.length > 0) {
      await prisma.question.deleteMany({ where: { chapterId } });
      await prisma.question.createMany({
        data: mcqs.map((q: { question: string; answer: string; options: string[] }) => ({
          chapterId,
          question: q.question,
          answer: q.answer,
          options: JSON.stringify(q.options),
        })),
      });
    }

    await prisma.chapter.update({
      where: { id: chapterId },
      data: {
        contentMarkdown: typeof contentMarkdown === "string" ? contentMarkdown : "",
        summaryMarkdown: typeof summaryMarkdown === "string" ? summaryMarkdown : "",
        youtubeVideoId,
        videoLanguage: language,
      },
    });

    return { success: true };
  },
  { connection }
);

courseWorker.on("failed", (job, err) => {
  console.error(`Course generation job failed for ${job.id}:`, err);
});
