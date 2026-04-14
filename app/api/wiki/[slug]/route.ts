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
interface ScoredImage {
  url: string;
  caption: string;
  score: number;
}

function scoreImage(item: { title?: string; caption?: { text?: string } }): number {
  const caption = (item.caption?.text ?? '').toLowerCase();
  const filename = (item.title ?? '').toLowerCase();
  const combined = caption + ' ' + filename;

  if (/life\s*(restoration|reconstruction)/i.test(combined)) return 100;
  if (/artist.?s?\s*(impression|restoration|reconstruction|interpretation)/i.test(combined)) return 90;
  if (/paleoart|palaeoart/i.test(combined)) return 85;
  if (/reconstruction|restoration/i.test(combined)) return 70;
  if (/skeletal|skeleton|diagram/i.test(combined)) return 50;
  if (/map|range|distribution|logo|icon|flag|cladogram|phylogen/i.test(combined)) return -1;
  if (/\.svg$/i.test(filename)) return -1;
  return 10;
}

function extractUrl(item: { srcset?: { src: string }[] }): string | null {
  const srcset = item.srcset ?? [];
  if (srcset.length > 0) {
    const largest = srcset[srcset.length - 1];
    return largest.src ? `https:${largest.src}` : null;
  }
  return null;
}

async function fetchImages(slug: string): Promise<{ best: string | null; gallery: ScoredImage[] }> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(slug)}`,
      { headers: { 'User-Agent': USER_AGENT }, next: { revalidate: 86400 } }
    );
    if (!res.ok) return { best: null, gallery: [] };
    const json = await res.json();
    const items = (json.items ?? []).filter(
      (item: { type: string }) => item.type === 'image'
    );
    if (items.length === 0) return { best: null, gallery: [] };

    const scored: ScoredImage[] = [];
    for (const item of items) {
      const s = scoreImage(item);
      if (s < 0) continue;
      const url = extractUrl(item);
      if (!url) continue;
      scored.push({
        url,
        caption: item.caption?.text ?? '',
        score: s,
      });
    }

    scored.sort((a, b) => b.score - a.score);
    const best = scored.length > 0 ? scored[0].url : null;
    // Return up to 6 unique gallery images
    const gallery = scored.slice(0, 6);

    return { best, gallery };
  } catch {
    return { best: null, gallery: [] };
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  // Rate limit check — skip for same-origin requests (our own pages fetching images)
  const referer = _req.headers.get('referer') ?? '';
  const origin = _req.headers.get('origin') ?? '';
  const isSameOrigin =
    referer.includes('localhost') ||
    referer.includes('127.0.0.1') ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    referer.includes('paleozooa.vercel.app') ||
    origin.includes('paleozooa.vercel.app');

  if (!isSameOrigin) {
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
  }

  const { slug } = await params;
  const cached = cache.get(slug);
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json(cached.data);
  }
  try {
    // Fetch summary and images in parallel
    const [summaryRes, images] = await Promise.all([
      fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`,
        { headers: { 'User-Agent': USER_AGENT }, next: { revalidate: 86400 } }
      ),
      fetchImages(slug),
    ]);

    if (!summaryRes.ok) return NextResponse.json(null, { status: summaryRes.status });
    const data = await summaryRes.json();

    // Override thumbnail with best image if found
    if (images.best) {
      data.thumbnail = { ...data.thumbnail, source: images.best };
      data.originalimage = { ...data.originalimage, source: images.best };
      data._imageSource = 'media-list-ranked';
    } else {
      data._imageSource = 'summary-default';
    }

    // Include gallery for detail pages
    data.gallery = images.gallery;

    cache.set(slug, { data, ts: Date.now() });
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=86400' },
    });
  } catch {
    return NextResponse.json(null, { status: 500 });
  }
}
