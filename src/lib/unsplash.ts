import axios from "axios";

export const getUnsplashImage = async (query: string) => {
  try {
    const { data } = await axios.get(
      `https://api.unsplash.com/search/photos`,
      {
        params: {
          query,
          per_page: 1,
        },
        headers: {
          Authorization: `Client-ID ${process.env.UNSPLASH_API_KEY}`,
        },
      }
    );

    if (!data?.results || data.results.length === 0) {
      return null;
    }

    return data.results[0].urls.small;
  } catch (error) {
    console.error("[UNSPLASH_ERROR]", error);
    return null;
  }
};
