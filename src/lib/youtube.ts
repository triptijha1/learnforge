import "server-only";

import axios from "axios";
import { YoutubeTranscript } from "youtube-transcript";
import { requireEnv } from "@/lib/env";

export type YoutubeRecommendation = {
  videoId: string;
  title: string;
  channelTitle: string;
};

export async function searchYoutube(
  query: string,
  language: "EN" | "HI" = "EN"
): Promise<YoutubeRecommendation | null> {
  const finalQuery = `${query} ${language === "HI" ? "Hindi" : "English"} tutorial`;
  const { data } = await axios.get("https://www.googleapis.com/youtube/v3/search", {
    timeout: 12_000,
    params: {
      key: requireEnv("YOUTUBE_API_KEY"),
      q: finalQuery,
      part: "snippet",
      type: "video",
      maxResults: 5,
      safeSearch: "moderate",
      videoEmbeddable: "true",
      videoSyndicated: "true",
      relevanceLanguage: language === "HI" ? "hi" : "en",
    },
  });

  const item = data?.items?.find((candidate: { id?: { videoId?: string } }) =>
    Boolean(candidate.id?.videoId)
  );
  if (!item?.id?.videoId) return null;

  return {
    videoId: item.id.videoId,
    title: item.snippet?.title ?? "Recommended lesson",
    channelTitle: item.snippet?.channelTitle ?? "",
  };
}

export async function getYoutubeTranscript(videoId: string): Promise<string | undefined> {
  try {
    const entries = await YoutubeTranscript.fetchTranscript(videoId);
    const transcript = entries.map((entry) => entry.text).join(" ").trim();
    return transcript || undefined;
  } catch (error) {
    console.warn("YOUTUBE_TRANSCRIPT_UNAVAILABLE", {
      videoId,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return undefined;
  }
}
