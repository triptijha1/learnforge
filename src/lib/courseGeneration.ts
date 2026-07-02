import { generateJson, generateText, generateStructuredText } from "./gemini";
import { getYoutubeTranscript } from "./youtube";

const promptEscaped = (value: string) => value.replace(/"/g, "\\\"");

export type CourseUnitOutput = {
  title: string;
  chapters: {
    chapter_title: string;
    youtube_search_query: string;
  }[];
};

export async function generateCourseStructure(
  title: string,
  units: string[]
): Promise<CourseUnitOutput[]> {
  const prompt = `You are an expert course designer. Create ${units.length} units for a course titled \"${promptEscaped(
    title
  )}\" using the user-provided unit names as themes. Return ONLY valid JSON in this format:\n\n[\n  {\n    \"title\": \"Unit Title\",\n    \"chapters\": [\n      { \"chapter_title\": \"Chapter Title\", \"youtube_search_query\": \"YouTube search query\" }\n    ]\n  }\n]\n\nRules:\n- Use the exact keys: title, chapters, chapter_title, youtube_search_query\n- Provide 3 to 5 chapters per unit\n- Keep chapter titles short and clear\n- Make youtube_search_query phrase highly relevant to the chapter topic\n- Do not include any commentary outside the JSON array\n\nUser units:\n${units
    .map((unit) => `- ${unit}`)
    .join("\n")}`;

  try {
    return await generateJson<CourseUnitOutput[]>(prompt, 900, 0.15);
  } catch (error) {
    console.error("[GENERATE_COURSE_STRUCTURE_ERROR]", error);
    return units.map((unit) => ({
      title: unit,
      chapters: [{
        chapter_title: `${unit} Overview`,
        youtube_search_query: `${title} ${unit}`,
      }],
    }));
  }
}

function buildTranscriptHint(transcript?: string) {
  if (!transcript) {
    return "";
  }

  const trimmed = transcript.trim();
  if (!trimmed) return "";

  const excerpt = trimmed.slice(0, 2500);
  return `Use this transcript excerpt to make the content more relevant:\n${excerpt}\n`;
}

async function getTranscriptSnippet(videoId?: string): Promise<string | null> {
  if (!videoId) return null;
  try {
    const transcript = await getYoutubeTranscript(videoId);
    return transcript ?? null;
  } catch (error) {
    console.warn("Transcript fetch failed for", videoId, error);
    return null;
  }
}

export async function generateChapterDetails(
  topic: string,
  youtubeSearchQuery: string,
  language: "EN" | "HI",
  mode: "content" | "summary" | "questions" = "content",
  videoId?: string
): Promise<string | Array<{ question: string; options: string[]; answer: string }>> {
  const transcriptSnippet = await getTranscriptSnippet(videoId);
  const languageName = language === "HI" ? "Hindi" : "English";
  const transcriptHint = buildTranscriptHint(transcriptSnippet ?? undefined);

  if (mode === "questions") {
    const prompt = `You are an expert instructor. Generate 5 multiple-choice questions for the topic \"${promptEscaped(
      topic
    )}\". Use the related YouTube search query: \"${promptEscaped(
      youtubeSearchQuery
    )}\". The chapter language is ${languageName}. ${transcriptHint}Return ONLY valid JSON in this exact format:\n[\n  {\n    \"question\": \"Question text\",\n    \"options\": [\"A\", \"B\", \"C\", \"D\"],\n    \"answer\": \"Correct option text\"\n  }\n]\n\nEnsure each answer is one of the provided options and keep the questions directly tied to the chapter topic.`;

    try {
      return await generateJson<
        Array<{ question: string; options: string[]; answer: string }>
      >(prompt, 450, 0.15);
    } catch (error) {
      console.error("[GENERATE_CHAPTER_QUESTIONS_ERROR]", error);
      return [];
    }
  }

  const prompt = `You are an expert course instructor. Write ${
    mode === "summary" ? "a concise markdown revision summary" : "a detailed markdown-formatted chapter"
  } on the topic \"${promptEscaped(topic)}\". Use the related YouTube search query \"${promptEscaped(
    youtubeSearchQuery
  )}\" and provide ${
    mode === "summary" ? "clear short notes with headings and bullets" : "structured headings, examples, and clear explanations"
  }. The language for the chapter is ${languageName}. ${transcriptHint}Return only the markdown content without JSON or extra commentary.`;

  const tokens = mode === "summary" ? 400 : 900;
  return await generateText(prompt, tokens, 0.15);
}
