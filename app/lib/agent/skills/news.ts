const GNEWS_KEY = process.env.GNEWS_API_KEY;

export async function fetchNews(keyword: string): Promise<{ score: number; headlines: string[] }> {
  try {
    if (!GNEWS_KEY) return { score: 0, headlines: [] };
    const res = await fetch(
      `https://gnews.io/api/v4/search?q=${encodeURIComponent(keyword)}&lang=en&max=5&apikey=${GNEWS_KEY}`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json();
    const articles = data.articles || [];
    return {
      score: Math.min(articles.length * 20, 100),
      headlines: articles.map((a: any) => a.title),
    };
  } catch {
    return { score: 0, headlines: [] };
  }
}
