'use client';
import { useState } from 'react';
import { useWikipedia } from '@/hooks/useWikipedia';

interface Props {
  taxonName: string;
  rank: string;
  subtitle?: string;
  headline?: string;
}

export function TaxonCard({ taxonName, rank, subtitle, headline }: Props) {
  const { data, loading } = useWikipedia(taxonName);
  const [imageHidden, setImageHidden] = useState(false);

  return (
    <div className="bg-[#faf5eb] border border-[#d4cbb8] rounded-xl overflow-hidden shadow-sm">
      <div className="p-4">
        {headline && (
          <p className="text-[#6b5c3e] text-sm font-medium mb-2">{headline}</p>
        )}
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <h2 className="text-lg font-bold text-stone-800">{taxonName}</h2>
          <span className="text-xs italic text-[#9a8a6a]">
            ({subtitle ?? rank})
          </span>
        </div>
        {loading && (
          <div className="h-16 bg-[#ede7db] animate-pulse rounded-lg mb-2" />
        )}
        {data?.extract && (
          <p className="text-stone-700 text-sm leading-relaxed line-clamp-6">
            {data.extract}
          </p>
        )}
        {!loading && !data?.extract && (
          <p className="text-[#b8a888] text-xs italic">
            No description available.
          </p>
        )}
      </div>

      {!imageHidden && data?.thumbnail?.source && (
        <div className="relative border-t border-[#e8e0d0] bg-[#f0ebe0]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.thumbnail.source}
            alt={taxonName}
            className="w-full max-h-64 object-contain"
          />
          <button
            onClick={() => setImageHidden(true)}
            className="absolute bottom-2 right-2 text-[10px] bg-[#faf5eb]/90 text-[#6b5c3e] px-2 py-0.5 rounded-md border border-[#d4cbb8] hover:bg-[#faf5eb] transition-colors"
          >
            Hide image
          </button>
        </div>
      )}

      {data?.content_urls?.desktop?.page && (
        <div className="px-4 py-2 border-t border-[#e8e0d0] flex items-center justify-between">
          <a
            href={data.content_urls.desktop.page}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#6b5c3e] hover:text-stone-800 underline transition-colors"
          >
            From Wikipedia
          </a>
          {imageHidden && data.thumbnail?.source && (
            <button
              onClick={() => setImageHidden(false)}
              className="text-[10px] bg-[#e8e0d0] text-[#6b5c3e] px-2 py-0.5 rounded-md border border-[#d4cbb8] hover:bg-[#ded6c4] transition-colors"
            >
              Show image
            </button>
          )}
        </div>
      )}
    </div>
  );
}
