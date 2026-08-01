const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID;
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;

export async function fetchRedditMentions(keyword: string): Promise<{ score: number; mentions: string[] }> {
  try {
    const res = await fetch(
      `https://www.reddit.com/search.json?q=${encodeURIComponent(keyword)}&limit=10&sort=hot&t=day`,
      { headers: { 'User-Agent': 'VURA/2.0' }, signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json();
    const posts = data.data?.children || [];
    return {
      score: Math.min(posts.length * 10, 100),
      mentions: posts.map((p: any) => p.data?.title),
    };
  } catch {
    return { score: 0, mentions: [] };
  }
}
