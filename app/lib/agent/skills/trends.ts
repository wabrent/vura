export async function fetchTrends(keyword: string): Promise<number> {
  try {
    const googleTrends = require('google-trends-api');
    const trends = await googleTrends.interestOverTime({ keyword, timeout: 5000 });
    const parsed = JSON.parse(trends);
    const values = parsed.default?.timelineData;
    if (!values?.length) return 0;
    const last = values[values.length - 1];
    return Math.min(last?.value?.[0] || 0, 100);
  } catch {
    return 0;
  }
}
