'use client';
import { TaxonomyNode } from '@/types';
import { RANK_COLORS } from '@/lib/constants';

export function InfoPanel({ node }: { node: TaxonomyNode | null }) {
  if (!node) {
    return (
      <div className="bg-stone-800/60 border border-stone-700 rounded-lg p-3 max-w-lg mx-auto text-center text-stone-500 text-xs">
        Click a node on the tree to see its info.
      </div>
    );
  }
  const color = RANK_COLORS[node.rank] ?? '#4b5563';
  return (
    <div className="bg-stone-800 border border-stone-600 rounded-lg p-3 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="font-bold text-white">{node.name}</span>
        <span className="text-xs text-stone-400 capitalize">{node.rank}</span>
      </div>
      <p className="text-stone-400 text-xs">
        {node.children.length > 0
          ? `${node.children.length} revealed descendant${
              node.children.length === 1 ? '' : 's'
            }`
          : node.organismId
          ? 'Leaf organism'
          : 'Branch node'}
      </p>
    </div>
  );
}
