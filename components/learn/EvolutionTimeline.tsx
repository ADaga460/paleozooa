'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Organism, TaxonomyNode } from '@/types';
import { buildFullTree } from '@/lib/taxonomy';
import { useWikipedia } from '@/hooks/useWikipedia';
import { DEPTH_COLORS } from '@/lib/constants';

interface Props {
  organisms: Organism[];
}

// Collapse chains of single-child internal nodes into one node
// so the tree isn't absurdly deep with clades nobody cares about.
// Keep nodes that branch (2+ children) or are leaves.
function collapseTree(node: TaxonomyNode): TaxonomyNode {
  if (node.children.length === 0) return node;

  // Recurse first
  let children = node.children.map(collapseTree);

  // If this node has exactly one child and it's not a leaf,
  // skip this node and promote the child
  if (children.length === 1 && children[0].children.length > 0 && !node.organismId) {
    return children[0];
  }

  return { ...node, children };
}

// Count total leaves under a node
function leafCount(node: TaxonomyNode): number {
  if (node.children.length === 0) return 1;
  return node.children.reduce((sum, c) => sum + leafCount(c), 0);
}

// Square thumbnail for a leaf organism
function LeafImage({ organismId, organisms }: { organismId: string; organisms: Organism[] }) {
  const org = organisms.find(o => o.id === organismId);
  const { data, loading } = useWikipedia(org?.wikipediaSlug ?? null);

  if (!org) return null;

  return (
    <Link
      href={`/learn/${org.id}`}
      className="group block"
      title={`${org.commonName} (${org.scientificName})`}
    >
      <div className="w-20 h-20 rounded-md overflow-hidden border border-[#d4cbb8] bg-[#ede7db] group-hover:border-[#8b6914] transition-colors">
        {loading ? (
          <div className="w-full h-full animate-pulse bg-[#e5ddd0]" />
        ) : data?.thumbnail?.source ? (
          <img
            src={data.thumbnail.source}
            alt={org.commonName}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-300 text-xs">?</div>
        )}
      </div>
      <p className="text-[10px] text-stone-600 text-center mt-1 leading-tight w-20 group-hover:text-stone-900 transition-colors line-clamp-2">
        {org.commonName}
      </p>
    </Link>
  );
}

// Recursive tree renderer
function TreeBranch({
  node,
  organisms,
  depth,
}: {
  node: TaxonomyNode;
  organisms: Organism[];
  depth: number;
}) {
  const isLeaf = node.children.length === 0 && node.organismId;
  const color = DEPTH_COLORS[Math.min(depth, DEPTH_COLORS.length - 1)];

  // Leaf: render the organism image
  if (isLeaf && node.organismId) {
    return (
      <div className="flex flex-col items-center">
        <LeafImage organismId={node.organismId} organisms={organisms} />
      </div>
    );
  }

  // Internal node: render the clade label + branches to children
  const hasMultipleChildren = node.children.length > 1;

  return (
    <div className="flex flex-col items-center">
      {/* Clade label */}
      <div
        className="px-3 py-1.5 rounded-md text-xs font-semibold text-white whitespace-nowrap"
        style={{ backgroundColor: color }}
      >
        {node.name}
        <span className="ml-1.5 opacity-60 text-[10px] font-normal">{node.rank}</span>
      </div>

      {/* Vertical line down from label */}
      <div className="w-px h-4 bg-[#c4b99a]" />

      {hasMultipleChildren ? (
        /* Branch split */
        <div className="relative flex items-start">
          {/* Horizontal connector spanning all children */}
          <div
            className="absolute top-0 h-px bg-[#c4b99a]"
            style={{
              left: `calc(${(100 / node.children.length / 2)}%)`,
              right: `calc(${(100 / node.children.length / 2)}%)`,
            }}
          />

          {node.children.map((child, i) => (
            <div key={child.name + i} className="flex flex-col items-center px-1.5 relative">
              {/* Vertical line from horizontal connector down to child */}
              <div className="w-px h-4 bg-[#c4b99a]" />
              <TreeBranch node={child} organisms={organisms} depth={depth + 1} />
            </div>
          ))}
        </div>
      ) : node.children.length === 1 ? (
        /* Single child - straight line */
        <div className="flex flex-col items-center">
          <TreeBranch node={node.children[0]} organisms={organisms} depth={depth + 1} />
        </div>
      ) : null}
    </div>
  );
}

// Prune tree to only show branches with a certain minimum leaf count,
// to avoid rendering 131 images at once
function pruneSmallBranches(node: TaxonomyNode, minLeaves: number): TaxonomyNode | null {
  if (node.children.length === 0) return node;
  const prunedChildren = node.children
    .filter(c => leafCount(c) >= minLeaves)
    .map(c => pruneSmallBranches(c, minLeaves))
    .filter((c): c is TaxonomyNode => c !== null);
  if (prunedChildren.length === 0 && !node.organismId) return null;
  return { ...node, children: prunedChildren };
}

export function EvolutionTimeline({ organisms }: Props) {
  const [expandedClades, setExpandedClades] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  // Build the full tree, collapse single-child chains
  const fullTree = useMemo(() => {
    const raw = buildFullTree(organisms);
    return collapseTree(raw);
  }, [organisms]);

  // Build a "summary" tree showing only major branches (3+ species)
  // with expandable detail
  const summaryTree = useMemo(() => {
    return pruneSmallBranches(fullTree, 1) ?? fullTree;
  }, [fullTree]);

  // For the main display, show the top-level branches as expandable sections
  // Each section is a major clade
  const topBranches = useMemo(() => {
    // Walk down until we hit meaningful splits
    let node = summaryTree;
    while (node.children.length === 1) {
      node = node.children[0];
    }
    return node;
  }, [summaryTree]);

  return (
    <div className="border border-[#d4cbb8] rounded-xl bg-[#faf5eb] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#d4cbb8] bg-[#ede7db]">
        <h2 className="text-base font-bold text-stone-800 font-serif">
          Tree of Life
        </h2>
        <p className="text-xs text-stone-500 mt-0.5">
          Scroll to explore evolutionary relationships between species
        </p>
      </div>

      <div
        ref={containerRef}
        className="p-4 overflow-x-auto"
      >
        <div className="min-w-fit">
          <TreeBranch node={topBranches} organisms={organisms} depth={0} />
        </div>
      </div>
    </div>
  );
}
