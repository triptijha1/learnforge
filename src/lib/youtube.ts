import axios from "axios";

export async function searchYoutube(
  query: string,
  language: "EN" | "HI" = "EN"
): Promise<string | null> {
  try {
    const finalQuery =
      language === "HI" ? `${query} हिंदी` : `${query} English`;

    const { data } = await axios.get(
      "https://www.googleapis.com/youtube/v3/search",
      {
        params: {
          key: process.env.YOUTUBE_API_KEY,
          q: finalQuery,
          type: "video",
          maxResults: 10,
          relevanceLanguage: language === "HI" ? "hi" : "en",
        },
      }
    );

    if (!data?.items?.length) {
      console.log("❌ YouTube search empty:", finalQuery);
      return null;
    }

    return data.items[0].id.videoId ?? null;
  } catch (error) {
    console.error("❌ YouTube API error", error);
    return null;
  }
}
