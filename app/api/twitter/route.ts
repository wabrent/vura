import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { accessToken } = await req.json();
    if (!accessToken) return NextResponse.json({ error: 'No token' }, { status: 400 });

    // Get user's recent tweets
    const userRes = await fetch('https://api.twitter.com/2/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!userRes.ok) return NextResponse.json({ error: 'Twitter auth failed' }, { status: 401 });
    const userData = await userRes.json();
    const userId = userData.data.id;

    // Fetch recent tweets
    const tweetsRes = await fetch(
      `https://api.twitter.com/2/users/${userId}/tweets?max_results=100&exclude=retweets,replies&tweet.fields=created_at`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!tweetsRes.ok) return NextResponse.json({ error: 'Failed to fetch tweets' }, { status: 500 });
    const tweetsData = await tweetsRes.json();

    const tweets = tweetsData.data || [];
    const keywords = ['polymarket', 'poly market', 'vura', 'prediction market', '@0x_vura'];
    const matched = tweets.filter((t: any) =>
      keywords.some(k => t.text.toLowerCase().includes(k))
    );

    return NextResponse.json({
      totalTweets: tweets.length,
      polymarketTweets: matched.length,
      username: userData.data.username,
      recent: matched.slice(0, 3).map((t: any) => ({ text: t.text.substring(0, 120), date: t.created_at }))
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
