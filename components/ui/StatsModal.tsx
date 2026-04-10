'use client';
import { Stats } from '@/types';

export function StatsModal({
  stats,
  onClose,
}: {
  stats: Stats;
  onClose: () => void;
}) {
  const dist = stats.guessDistribution;
  const maxVal = Math.max(1, ...Object.values(dist));
  const cells = [
    { label: 'Played', value: stats.gamesPlayed },
    {
      label: 'Win %',
      value: stats.gamesPlayed
        ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
        : 0,
    },
    { label: 'Streak', value: stats.currentStreak },
    { label: 'Best', value: stats.bestStreak },
  ];
  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#faf5eb] rounded-xl max-w-md w-full p-6 border border-[#d4cbb8] shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-stone-800 mb-4 font-serif">Statistics</h2>
        <div className="grid grid-cols-4 gap-4 mb-6">
          {cells.map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-bold text-stone-800">{value}</div>
              <div className="text-xs text-[#9a8a6a]">{label}</div>
            </div>
          ))}
        </div>
        <h3 className="text-sm font-medium text-[#6b5c3e] mb-2">
          Guess Distribution
        </h3>
        <div className="space-y-1">
          {Array.from({ length: 20 }, (_, i) => i + 1).map(n => {
            const count = dist[n] ?? 0;
            if (count === 0) return null;
            return (
              <div key={n} className="flex items-center gap-2 text-xs">
                <span className="w-4 text-[#9a8a6a]">{n}</span>
                <div className="flex-1 bg-[#e8e0d0] rounded-full overflow-hidden h-4">
                  <div
                    className="bg-[#5a8a3a] h-full rounded-full"
                    style={{ width: `${(count / maxVal) * 100}%` }}
                  />
                </div>
                <span className="w-6 text-stone-700 text-right">{count}</span>
              </div>
            );
          })}
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full bg-[#e8e0d0] border border-[#c4b99a] hover:bg-[#ded6c4] text-[#5a4a30] rounded-lg py-2 text-sm transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
