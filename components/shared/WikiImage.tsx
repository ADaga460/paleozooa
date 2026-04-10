'use client';
import { useWikipedia } from '@/hooks/useWikipedia';

export function WikiImage({ slug, alt }: { slug: string; alt: string }) {
  const { data, loading } = useWikipedia(slug);

  if (loading) {
    return <div className="w-full h-48 bg-stone-700 animate-pulse rounded" />;
  }

  if (!data?.thumbnail?.source) {
    return (
      <div className="w-full h-48 bg-stone-700 rounded flex flex-col items-center justify-center text-stone-400 text-sm p-4">
        <span>No reconstruction available</span>
        {data?.content_urls?.desktop?.page && (
          <a
            href={data.content_urls.desktop.page}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 underline mt-2"
          >
            View on Wikipedia
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-48 bg-stone-900 rounded overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={data.thumbnail.source}
        alt={alt}
        className="w-full h-full object-cover"
      />
      {data.content_urls?.desktop?.page && (
        <a
          href={data.content_urls.desktop.page}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-1 right-1 text-[10px] bg-black/70 text-amber-300 px-1.5 py-0.5 rounded"
        >
          Source: Wikipedia
        </a>
      )}
    </div>
  );
}
