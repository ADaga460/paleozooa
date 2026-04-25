'use client';
import Link from 'next/link';
import Image from 'next/image';

export function Header({
  mode,
  onModeChange,
  onShowStats,
  onShowHowTo,
}: {
  mode: 'daily' | 'practice';
  onModeChange: (m: 'daily' | 'practice') => void;
  onShowStats: () => void;
  onShowHowTo: () => void;
}) {
  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-[#d4cbb8] bg-[#ede7db]">
      <div className="flex items-center gap-2">
        {/* Logo size matches the wordmark optical height. Width is auto-derived
            from the image's intrinsic aspect ratio so a non-square crop won't
            stretch. priority=true because this is above-the-fold on every page. */}
        <Image
          src="/logo.png"
          alt="Paleozooa"
          width={32}
          height={32}
          priority
          className="h-8 w-8 object-contain"
        />
        <h1 className="text-lg font-bold text-stone-800 tracking-wider font-serif">
          PALEOZOOA
        </h1>
      </div>
      <div className="flex gap-2 items-center">
        {(['daily', 'practice'] as const).map(m => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className={`rounded-lg px-3 py-1 text-xs transition-colors ${
              mode === m
                ? 'bg-[#c4b99a] text-stone-800 font-bold'
                : 'bg-[#faf5eb] border border-[#d4cbb8] text-[#6b5c3e] hover:bg-[#e8e0d0]'
            }`}
          >
            {m === 'daily' ? 'Daily' : 'Practice'}
          </button>
        ))}
        <Link
          href="/learn"
          className="bg-[#faf5eb] border border-[#d4cbb8] rounded-lg px-2 py-1 text-xs text-[#6b5c3e] hover:bg-[#e8e0d0] transition-colors"
        >
          Learn
        </Link>
        <button
          onClick={onShowHowTo}
          className="bg-[#faf5eb] border border-[#d4cbb8] rounded-lg px-2 py-1 text-xs text-[#6b5c3e] hover:bg-[#e8e0d0] transition-colors"
          aria-label="How to play"
        >
          ?
        </button>
        <button
          onClick={onShowStats}
          className="bg-[#faf5eb] border border-[#d4cbb8] rounded-lg px-2 py-1 text-xs text-[#6b5c3e] hover:bg-[#e8e0d0] transition-colors"
          aria-label="Stats"
        >
          Stats
        </button>
      </div>
    </header>
  );
}
