'use client';
import { Organism } from '@/types';
import { WikiImage } from '@/components/shared/WikiImage';
import { TimePeriodBadge } from '@/components/ui/TimePeriodBadge';
import { useWikipedia } from '@/hooks/useWikipedia';

export function OrganismCard({
  organism,
  isWon,
}: {
  organism: Organism;
  isWon: boolean;
}) {
  const { data } = useWikipedia(organism.wikipediaSlug);
  return (
    <div className="bg-stone-800 rounded-lg border border-stone-600 overflow-hidden max-w-md mx-auto">
      <WikiImage slug={organism.wikipediaSlug} alt={organism.commonName} />
      <div className="p-4">
        <div className="flex items-start justify-between mb-2 gap-2">
          <div>
            <h2 className="text-lg font-bold text-white">
              {organism.commonName}
            </h2>
            <p className="text-sm italic text-stone-400">
              {organism.scientificName}
            </p>
          </div>
          <TimePeriodBadge period={organism.timePeriod} />
        </div>
        <p
          className={`font-medium mb-2 ${
            isWon ? 'text-amber-400' : 'text-stone-400'
          }`}
        >
          {isWon
            ? '🎉 Correct!'
            : `The answer was ${organism.commonName}`}
        </p>
        {data?.extract && (
          <p className="text-stone-300 text-sm line-clamp-4">{data.extract}</p>
        )}
      </div>
    </div>
  );
}
