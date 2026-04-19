import { NextResponse } from 'next/server';

// Bounded LRU-ish cache: delete-then-set reorders entries so iteration order
// gives us insertion recency. Caps total entries to prevent an attacker from
// driving memory up by requesting many unique slugs. Null responses are not
// cached so a 404 doesn't pin a useless entry.
const CACHE_MAX = 200;
const cache = new Map<string, { data: unknown; ts: number }>();
const TTL = 24 * 60 * 60 * 1000;

function cacheGet(key: string): unknown | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts >= TTL) {
    cache.delete(key);
    return null;
  }
  // Refresh recency.
  cache.delete(key);
  cache.set(key, entry);
  return entry.data;
}

function cacheSet(key: string, data: unknown) {
  if (data == null) return; // Don't cache negative responses.
  cache.delete(key);
  cache.set(key, { data, ts: Date.now() });
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

const USER_AGENT = 'Paleozooa/1.0 (https://github.com/paleozooa/paleozooa; contact@example.com)';

// Hostnames that count as "our own site". Exact hostname equality — no
// substring matching, which previously allowed `paleozooa.vercel.app.evil.com`
// to masquerade as same-origin and skip the rate limit.
const TRUSTED_HOSTS = new Set<string>([
  'localhost',
  '127.0.0.1',
  'paleozooa.vercel.app',
  'paleozooa.dev',
  'www.paleozooa.dev',
]);

function hostFromHeader(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isTrustedOrigin(req: Request): boolean {
  const refHost = hostFromHeader(req.headers.get('referer'));
  const origHost = hostFromHeader(req.headers.get('origin'));
  return (
    (refHost !== null && TRUSTED_HOSTS.has(refHost)) ||
    (origHost !== null && TRUSTED_HOSTS.has(origHost))
  );
}

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
  // On Vercel, the platform rewrites X-Forwarded-For so the leftmost entry
  // is the original client. If you deploy elsewhere with a different proxy
  // topology (e.g. behind Cloudflare + your own LB), adjust this to trust the
  // rightmost hop you control instead.
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip') ?? 'unknown';
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
  // Rate limit check — skip only for requests whose Referer/Origin header
  // parses to a hostname in our trusted set. Previously this used `String.includes`,
  // which matched `paleozooa.vercel.app.evil.com` as same-origin and let
  // attackers bypass the rate limit entirely.
  if (!isTrustedOrigin(_req)) {
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
  // Slug sanity cap — the route already only accepts a single path segment,
  // but belt-and-braces guard against extremely long values being cached.
  if (!slug || slug.length > 200) {
    return NextResponse.json({ error: 'invalid slug' }, { status: 400 });
  }
  const cached = cacheGet(slug);
  if (cached !== null) {
    return NextResponse.json(cached);
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

    cacheSet(slug, data);
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=86400' },
    });
  } catch {
    return NextResponse.json(null, { status: 500 });
  }
}
