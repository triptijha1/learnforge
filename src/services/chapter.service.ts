import { generateText } from "@/lib/ai/gemini";
import * as chapterRepo from "@/repositories/chapter.repository";

export async function getOrGenerateChapter(
  chapterId: string,
  userId: string
) {
  const chapter = await chapterRepo.findChapterById(
    chapterId,
    userId
  );

  if (!chapter) {
    throw new Error("Chapter not found");
  }

  let content = chapter.contentMarkdown;
  let summary = chapter.summaryMarkdown;

  // Generate ONLY if missing
  if (!content) {
    const prompt = `
Generate a detailed markdown chapter for "${chapter.name}".

At the end, return:

---
SUMMARY:
<short summary>
`;

    const result = await generateText(prompt);

    const parts = result.split("---SUMMARY:");
    content = parts[0]?.trim();
    summary = parts[1]?.trim();

    await chapterRepo.updateChapterContent(chapter.id, {
      contentMarkdown: content,
      summaryMarkdown: summary,
    });
  }

  return {
    ...chapter,
    contentMarkdown: content,
    summaryMarkdown: summary,
  };
}