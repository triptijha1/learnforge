import "server-only";

import axios from "axios";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1509228468518-180dd4864904?q=80&w=1200&auto=format&fit=crop";

export async function getUnsplashImage(query: string): Promise<string> {
  if (!process.env.UNSPLASH_API_KEY) return FALLBACK_IMAGE;
  try {
    const { data } = await axios.get("https://api.unsplash.com/search/photos", {
      timeout: 8_000,
      params: { query, per_page: 1, orientation: "landscape" },
      headers: { Authorization: `Client-ID ${process.env.UNSPLASH_API_KEY}` },
    });
    return data?.results?.[0]?.urls?.regular ?? FALLBACK_IMAGE;
  } catch (error) {
    console.warn("UNSPLASH_FALLBACK", error instanceof Error ? error.message : error);
    return FALLBACK_IMAGE;
  }
}
