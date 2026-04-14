import { NextResponse } from 'next/server';

const cache = new Map<string, { data: unknown; ts: number }>();
const TTL = 24 * 60 * 60 * 1000;

const USER_AGENT = 'Paleozooa/1.0 (https://github.com/paleozooa/paleozooa; contact@example.com)';

// --- Rate Limiter ---
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30;
const rateLimitMap = new Map<string, number[]>();

// Periodically clean up stale entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of rateLimitMap) {
    const filtered = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (filtered.length === 0) {
      rateLimitMap.delete(ip);
    } else {
      rateLimitMap.set(ip, filtered);
    }
  }
}, CLEANUP_INTERVAL_MS);

function getClientIp(req: Request): string {
  const headers = new Headers(req.headers);
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return headers.get('x-real-ip') ?? 'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) ?? [];
  // Remove timestamps outside the current window
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    // Calculate when the oldest request in the window will expire
    const oldestInWindow = recent[0];
    const retryAfterMs = RATE_LIMIT_WINDOW_MS - (now - oldestInWindow);
    return { allowed: false, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) };
  }

  recent.push(now);
  rateLimitMap.set(ip, recent);
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Pick the best image from Wikipedia's media-list endpoint.
 * Priority: life reconstruction > skeletal/restoration > default thumbnail.
 */
async function fetchBestImage(slug: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(slug)}`,
      { headers: { 'User-Agent': USER_AGENT }, next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const items = (json.items ?? []).filter(
      (item: { type: string }) => item.type === 'image'
    );
    if (items.length === 0) return null;

    // Score each image based on caption and filename keywords
    function scoreImage(item: { title?: string; caption?: { text?: string } }): number {
      const caption = (item.caption?.text ?? '').toLowerCase();
      const filename = (item.title ?? '').toLowerCase();
      const combined = caption + ' ' + filename;

      // Highest priority: life reconstructions / artist restorations
      if (/life\s*(restoration|reconstruction)/i.test(combined)) return 100;
      if (/artist.?s?\s*(impression|restoration|reconstruction|interpretation)/i.test(combined)) return 90;
      if (/paleoart|palaeoart/i.test(combined)) return 85;

      // Medium priority: generic reconstructions / restorations
      if (/reconstruction|restoration/i.test(combined)) return 70;

      // Lower priority: skeletal diagrams
      if (/skeletal|skeleton|diagram/i.test(combined)) return 50;

      // Filter out non-useful images
      if (/map|range|distribution|logo|icon|flag|cladogram|phylogen/i.test(combined)) return -1;
      if (/\.svg$/i.test(filename)) return -1;

      // Default: any image (prefer earlier ones in the article)
      return 10;
    }

    let best = null;
    let bestScore = -1;
    for (const item of items) {
      const score = scoreImage(item);
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }

    if (!best || bestScore < 0) return null;

    // Extract the best resolution URL from srcset
    const srcset = best.srcset ?? [];
    if (srcset.length > 0) {
      // Pick the largest available (last entry is usually highest res)
      const largest = srcset[srcset.length - 1];
      return largest.src ? `https:${largest.src}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  // Rate limit check
  const clientIp = getClientIp(_req);
  const { allowed, retryAfterSeconds } = checkRateLimit(clientIp);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfterSeconds) },
      }
    );
  }

  const { slug } = await params;
  const cached = cache.get(slug);
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json(cached.data);
  }
  try {
    // Fetch summary and best image in parallel
    const [summaryRes, bestImageUrl] = await Promise.all([
      fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`,
        { headers: { 'User-Agent': USER_AGENT }, next: { revalidate: 86400 } }
      ),
      fetchBestImage(slug),
    ]);

    if (!summaryRes.ok) return NextResponse.json(null, { status: summaryRes.status });
    const data = await summaryRes.json();

    // Override thumbnail with best image if found
    if (bestImageUrl) {
      data.thumbnail = { ...data.thumbnail, source: bestImageUrl };
      data.originalimage = { ...data.originalimage, source: bestImageUrl };
      data._imageSource = 'media-list-ranked';
    } else {
      data._imageSource = 'summary-default';
    }

    cache.set(slug, { data, ts: Date.now() });
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=86400' },
    });
  } catch {
    return NextResponse.json(null, { status: 500 });
  }
}
