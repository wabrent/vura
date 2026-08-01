import { NextResponse } from 'next/server';

const RSS_FEEDS = [
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', source: 'CoinDesk' },
  { url: 'https://cryptoslate.com/feed/', source: 'CryptoSlate' },
];

async function fetchRss(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  return res.text();
}

function parseRssItems(xml: string, source: string) {
  const items: any[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const content = match[1];
    const title = content.match(/<title[^>]*>([^<]*)<\/title>/)?.[1] || '';
    const link = content.match(/<link[^>]*>([^<]*)<\/link>/)?.[1] || '';
    const description = content.match(/<description[^>]*>([^<]*)<\/description>/)?.[1]?.replace(/<[^>]*>/g, '') || '';
    const pubDate = content.match(/<pubDate[^>]*>([^<]*)<\/pubDate>/)?.[1] || '';
    const categories = (content.match(/<category[^>]*>([^<]*)<\/category>/g) || []).map((c: string) => c.replace(/<\/?category[^>]*>/g, ''));

    if (title && link) {
      items.push({ title, link, description, pubDate, categories, source });
    }
  }
  return items;
}

function classifyCategory(title: string, categories: string[]): string {
  const lower = title.toLowerCase();
  const all = [...categories, lower].join(' ');
  if (/politics|election|trump|biden|congress|senate|vote|government/i.test(all)) return 'politics';
  if (/bitcoin|ethereum|crypto|btc|eth|solana|blockchain|defi|nft|token/i.test(all)) return 'crypto';
  if (/nba|nfl|mlb|soccer|sports|champion|super bowl|world cup|football|basketball/i.test(all)) return 'sports';
  if (/economy|fed|inflation|rate|gdp|market|stock|finance/i.test(all)) return 'economy';
  if (/war|geopolitics|china|russia|ukraine|iran|military|sanctions/i.test(all)) return 'geopolitics';
  return 'general';
}

function classifySentiment(title: string): 'bullish' | 'bearish' | 'neutral' {
  const lower = title.toLowerCase();
  if (/surge|rally|gain|bullish|approve|breakthrough|positive|soar|boom|record/i.test(lower)) return 'bullish';
  if (/crash|drop|fear|bearish|ban|crisis|negative|decline|slump|plunge/i.test(lower)) return 'bearish';
  return 'neutral';
}

export async function GET() {
  try {
    const allItems: any[] = [];

    for (const feed of RSS_FEEDS) {
      try {
        const xml = await fetchRss(feed.url);
        const parsed = parseRssItems(xml, feed.source);
        allItems.push(...parsed);
      } catch {}
    }

    // Sort by date, newest first
    allItems.sort((a, b) => {
      const da = new Date(a.pubDate).getTime();
      const db = new Date(b.pubDate).getTime();
      return db - da;
    });

    const articles = allItems.slice(0, 15).map((item, i) => ({
      id: `news_${i}_${Date.now()}`,
      title: item.title,
      source: item.source,
      url: item.link,
      date: item.pubDate || new Date().toISOString(),
      summary: item.description?.substring(0, 200) || '',
      category: classifyCategory(item.title, item.categories),
      sentiment: classifySentiment(item.title),
      relevance: Math.round(60 + Math.random() * 40),
    }));

    return NextResponse.json(articles);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
