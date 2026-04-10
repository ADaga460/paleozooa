import { NextResponse } from 'next/server';

const cache = new Map<string, { data: unknown; ts: number }>();
const TTL = 24 * 60 * 60 * 1000;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const cached = cache.get(slug);
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json(cached.data);
  }
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`,
      {
        headers: {
          'User-Agent':
            'Paleozooa/1.0 (https://github.com/paleozooa/paleozooa; contact@example.com)',
        },
        next: { revalidate: 86400 },
      }
    );
    if (!res.ok) return NextResponse.json(null, { status: res.status });
    const data = await res.json();
    cache.set(slug, { data, ts: Date.now() });
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=86400' },
    });
  } catch {
    return NextResponse.json(null, { status: 500 });
  }
}
