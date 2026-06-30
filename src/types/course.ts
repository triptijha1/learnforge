// src/types/course.ts

export type QuestionDTO = {
  id: string;
  question: string;
  answer: string;
  options: string;
};

export type ChapterDTO = {
  id: string;
  name: string;
  youtubeSearchQuery: string;
  youtubeVideoId: string | null;
  videoLanguage: "EN" | "HI";
  contentMarkdown: string | null;
  summaryMarkdown: string | null;
  createdAt: Date;
  questions: QuestionDTO[];
};

export type UnitDTO = {
  id: string;
  name: string;
  chapters: ChapterDTO[];
};

export type CourseDTO = {
  id: string;
  name: string;
  image: string | null;
  units: UnitDTO[];
};