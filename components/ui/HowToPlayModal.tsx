'use client';

export function HowToPlayModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#faf5eb] rounded-xl max-w-md w-full p-6 border border-[#d4cbb8] shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-stone-800 mb-4 font-serif">How to Play</h2>
        <ul className="space-y-2 text-stone-700 text-sm">
          <li>Guess the mystery Mesozoic animal (252–66 MYA).</li>
          <li>Each wrong guess reveals shared ancestors on a phylogenetic tree.</li>
          <li>Use the tree to narrow down possibilities.</li>
          <li>You have <strong className="text-stone-900">20 guesses</strong>.</li>
          <li>Use <strong className="text-stone-900">Hint</strong> to reveal the next clade, costing 2 guesses.</li>
          <li>A new animal every day in Daily mode.</li>
          <li>Practice mode gives unlimited random rounds.</li>
        </ul>
        <button
          onClick={onClose}
          className="mt-6 w-full bg-[#5a8a3a] border border-[#4a7a2a] hover:bg-[#4d7d2d] text-white rounded-lg py-2 text-sm font-medium transition-colors"
        >
          Let&apos;s Play
        </button>
      </div>
    </div>
  );
}
