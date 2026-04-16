'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Organism } from '@/types';
import { useWikipedia } from '@/hooks/useWikipedia';
import { PERIOD_COLORS } from '@/lib/constants';
import { trackLearnView } from '@/lib/analytics';
import organismsData from '@/data/organisms.json';

const allOrganisms = organismsData as Organism[];

function getRelated(organism: Organism): Organism[] {
  // Find organisms sharing the deepest taxonomy node
  const path = organism.taxonomyPath;
  const related: { org: Organism; depth: number }[] = [];

  for (const o of allOrganisms) {
    if (o.id === organism.id) continue;
    let shared = 0;
    for (let i = 0; i < Math.min(path.length, o.taxonomyPath.length); i++) {
      if (path[i] === o.taxonomyPath[i]) shared = i + 1;
      else break;
    }
    if (shared >= 3) related.push({ org: o, depth: shared });
  }

  return related
    .sort((a, b) => b.depth - a.depth)
    .slice(0, 6)
    .map(r => r.org);
}

function RelatedThumb({ organism }: { organism: Organism }) {
  const { data } = useWikipedia(organism.wikipediaSlug);
  return (
    <Link
      href={`/learn/${organism.id}`}
      className="flex flex-col items-center w-20 group"
    >
      <div className="w-14 h-14 rounded-full border-2 border-[#d4cbb8] overflow-hidden bg-[#ede7db] group-hover:border-[#8b6914] transition-colors">
        {data?.thumbnail?.source ? (
          <img
            src={data.thumbnail.source}
            alt={organism.commonName}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-300 text-lg">?</div>
        )}
      </div>
      <span className="text-[10px] text-stone-600 text-center mt-1 group-hover:text-stone-900 transition-colors leading-tight">
        {organism.commonName}
      </span>
    </Link>
  );
}

const DIFFICULTY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Well-known', color: '#5a9a5a' },
  2: { label: 'Moderate', color: '#c08820' },
  3: { label: 'Obscure', color: '#c0392b' },
};

export function OrganismDetail({ organism }: { organism: Organism }) {
  useEffect(() => { trackLearnView(organism.id); }, [organism.id]);
  const { data, loading } = useWikipedia(organism.wikipediaSlug);
  const periodColor = PERIOD_COLORS[organism.timePeriod] ?? '#6b5c3e';
  const related = getRelated(organism);
  const diffInfo = DIFFICULTY_LABELS[organism.difficulty] ?? DIFFICULTY_LABELS[2];
  const gallery = (data?.gallery ?? []).filter(
    img => img.url !== data?.thumbnail?.source
  ).slice(0, 4);

  return (
    <div className="min-h-screen bg-[#f5f0e8] text-stone-900">
      <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-[#d4cbb8] bg-[#ede7db]">
        <h1 className="text-lg font-bold text-stone-800 tracking-wider font-serif">
          PALEOZOOA
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => window.history.back()}
            className="bg-[#faf5eb] border border-[#d4cbb8] rounded-lg px-3 py-1 text-xs text-[#6b5c3e] hover:bg-[#e8e0d0] transition-colors"
          >
            All Animals
          </button>
          <Link
            href="/"
            className="bg-[#faf5eb] border border-[#d4cbb8] rounded-lg px-3 py-1 text-xs text-[#6b5c3e] hover:bg-[#e8e0d0] transition-colors"
          >
            Play
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 md:p-6">
        {/* Hero image */}
        <div className="bg-[#ede7db] rounded-xl overflow-hidden border border-[#d4cbb8] mb-4">
          {loading ? (
            <div className="h-72 flex items-center justify-center">
              <p className="text-sm text-stone-400 animate-pulse">Loading...</p>
            </div>
          ) : data?.thumbnail?.source ? (
            <img
              src={data.thumbnail.source}
              alt={organism.commonName}
              className="w-full max-h-96 object-contain bg-[#f0ebe1]"
            />
          ) : (
            <div className="h-48 flex items-center justify-center text-stone-400 text-sm">
              No image available
            </div>
          )}
        </div>

        {/* Name & badges */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <h2 className="text-2xl font-bold text-stone-800 font-serif">
              {organism.commonName}
            </h2>
            <p className="text-sm text-stone-500 italic">{organism.scientificName}</p>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span
              className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
              style={{ backgroundColor: periodColor }}
            >
              {organism.timePeriod}
            </span>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: diffInfo.color }}
            >
              {diffInfo.label}
            </span>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex flex-wrap gap-3 mb-4 text-xs text-stone-500">
          <span>{organism.timePeriodMya} million years ago</span>
          <span>Difficulty: {organism.difficulty}/3</span>
        </div>

        {/* Description */}
        {data?.extract && (
          <div className="mb-5">
            <p className="text-sm text-stone-700 leading-relaxed">{data.extract}</p>
            {data.content_urls?.desktop?.page && (
              <a
                href={data.content_urls.desktop.page}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs text-[#5a8f5a] hover:underline mt-2"
              >
                Read full article on Wikipedia
              </a>
            )}
          </div>
        )}

        {/* Image gallery */}
        {gallery.length > 0 && (
          <div className="mb-5">
            <h3 className="text-xs text-stone-500 font-medium mb-2 uppercase tracking-wide">
              Gallery
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {gallery.map((img, i) => (
                <div key={i} className="rounded-lg overflow-hidden border border-[#d4cbb8] bg-[#f0ebe1]">
                  <img
                    src={img.url}
                    alt={img.caption || `${organism.commonName} image ${i + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-36 object-cover"
                  />
                  {img.caption && (
                    <p className="text-[10px] text-stone-500 px-2 py-1 leading-tight">
                      {img.caption.length > 100 ? img.caption.slice(0, 100) + '...' : img.caption}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Taxonomy path */}
        <div className="bg-[#faf5eb] border border-[#d4cbb8] rounded-lg p-3 mb-4">
          <h3 className="text-xs text-stone-500 font-medium mb-2 uppercase tracking-wide">
            Classification
          </h3>
          <div className="space-y-1">
            {organism.taxonomyPath.map((taxon, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] text-stone-400 w-16 text-right flex-shrink-0">
                  {organism.taxonomyRanks[i]}
                </span>
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: i < 4 ? '#c08820' : i < 7 ? '#5a8a3a' : '#4a7a4a' }}
                />
                <span className="text-xs text-stone-700 font-medium">{taxon}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tags */}
        {organism.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-5">
            {organism.tags.map(tag => (
              <span key={tag} className="text-[10px] bg-[#e8e0d0] text-stone-600 rounded-full px-2.5 py-0.5 border border-[#d4cbb8]">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Related species */}
        {related.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs text-stone-500 font-medium mb-3 uppercase tracking-wide">
              Related Species
            </h3>
            <div className="flex flex-wrap gap-3">
              {related.map(r => (
                <RelatedThumb key={r.id} organism={r} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
