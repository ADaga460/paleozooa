'use client';

import Link from 'next/link';
import { Organism } from '@/types';
import { useWikipedia } from '@/hooks/useWikipedia';

const PERIOD_COLORS: Record<string, string> = {
  'Late Triassic': '#a85c32',
  'Middle Triassic': '#b8723e',
  'Early Triassic': '#c4884a',
  'Late Jurassic': '#7a8a3a',
  'Middle Jurassic': '#8a9a4a',
  'Early Jurassic': '#6a7a2a',
  'Late Cretaceous': '#4a7a7a',
  'Early Cretaceous': '#5a8a8a',
};

export function LearnCard({ organism }: { organism: Organism }) {
  const { data, loading } = useWikipedia(organism.wikipediaSlug);
  const periodColor = PERIOD_COLORS[organism.timePeriod] ?? '#6b5c3e';

  return (
    <Link href={`/learn/${organism.id}`} className="border border-[#d4cbb8] rounded-lg bg-white overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      {/* Image area */}
      <div className="bg-[#f0ebe1] flex items-center justify-center h-40">
        {loading && (
          <p className="text-xs text-stone-400 animate-pulse">Loading...</p>
        )}
        {!loading && data?.thumbnail?.source ? (
          <img
            src={data.thumbnail.source}
            alt={organism.commonName}
            loading="lazy"
            decoding="async"
            className="max-h-40 w-full object-contain"
          />
        ) : !loading ? (
          <p className="text-xs text-stone-400">No image available</p>
        ) : null}
      </div>

      {/* Info */}
      <div className="px-3 py-2.5 flex-1 flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-bold text-stone-800">{organism.commonName}</p>
            <p className="text-xs text-stone-500 italic">{organism.scientificName}</p>
          </div>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 text-white font-medium mt-0.5"
            style={{ backgroundColor: periodColor }}
          >
            {organism.timePeriod}
          </span>
        </div>

        {data?.extract && (
          <p className="text-xs text-stone-600 leading-relaxed flex-1">
            {data.extract.length > 250
              ? data.extract.slice(0, 250).replace(/\s\S*$/, '') + '...'
              : data.extract}
          </p>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-stone-400">{organism.timePeriodMya} MYA</span>
          {data?.content_urls?.desktop?.page && (
            <a
              href={data.content_urls.desktop.page}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-[#5a8f5a] hover:underline"
            >
              Wikipedia ↗
            </a>
          )}
        </div>
      </div>
    </Link>
  );
}
