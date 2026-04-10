'use client';
import { useState, useEffect } from 'react';
import { WikipediaResponse } from '@/types';

const wikiCache = new Map<string, WikipediaResponse>();

export function useWikipedia(slug: string | null) {
  const [data, setData] = useState<WikipediaResponse | null>(
    slug ? wikiCache.get(slug) ?? null : null
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!slug) {
      setData(null);
      return;
    }
    const cached = wikiCache.get(slug);
    if (cached) {
      setData(cached);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/wiki/${encodeURIComponent(slug)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (cancelled) return;
        if (d) {
          wikiCache.set(slug, d);
          setData(d);
        } else {
          setData(null);
        }
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { data, loading };
}
