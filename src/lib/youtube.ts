import axios from "axios";
import { YoutubeTranscript } from "youtube-transcript";

const API_KEY = process.env.YOUTUBE_API_KEY;
if (!API_KEY) {
  console.warn("YOUTUBE_API_KEY is not set. YouTube search will fail without it.");
}

export async function searchYoutube(
  query: string,
  language: "EN" | "HI" = "EN"
): Promise<string | null> {
  if (!API_KEY) {
    return null;
  }

  const finalQuery = `${query} ${language === "HI" ? "Hindi" : "English"}`;

  try {
    const { data } = await axios.get(
      "https://www.googleapis.com/youtube/v3/search",
      {
        params: {
          key: API_KEY,
          q: finalQuery,
          part: "snippet",
          type: "video",
          maxResults: 10,
          relevanceLanguage: language === "HI" ? "hi" : "en",
          videoEmbeddable: "true",
        },
      }
    );

    const item = data?.items?.[0];
    return item?.id?.videoId ?? null;
  } catch (error) {
    console.error("YouTube API search failed:", error);
    return null;
  }
}

export async function fetchYoutubeTranscript(videoId: string): Promise<string> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: "en",
    });
    return transcript.map((item: any) => item.text).join(" ");
  } catch (error) {
    console.warn(`Transcript unavailable for ${videoId}:`, error);
    return "";
  }
}
