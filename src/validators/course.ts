import { z } from "zod";

export const createCourseSchema = z.object({
  title: z.string().trim().min(3).max(100),
  units: z.array(z.string().trim().min(2).max(100)).min(1).max(8),
  language: z.enum(["EN", "HI"]),
});

export const createChapterSchema = createCourseSchema;

export const chapterInfoSchema = z.object({
  chapterId: z.string().cuid(),
});

export const courseIdSchema = z.object({
  courseId: z.string().cuid(),
});
