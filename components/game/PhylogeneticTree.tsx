'use client';
import { useMemo } from 'react';
import { TaxonomyNode } from '@/types';
import { DEPTH_COLORS } from '@/lib/constants';

interface Props {
  revealedTree: TaxonomyNode;
  mysteryPath: string[];
  mysteryId: string;
  onNodeClick?: (node: TaxonomyNode) => void;
  selectedNodeName?: string | null;
  newNodes?: string[];
  gameOver: boolean;
}

function getDepthColor(depth: number): string {
  return DEPTH_COLORS[Math.min(depth, DEPTH_COLORS.length - 1)];
}

/**
 * Reorder children: spine in center, branches alternate L/R.
 */
function reorderChildren(node: TaxonomyNode, spineSet: Set<string>): TaxonomyNode[] {
  const spineChild = node.children.find(
    c => spineSet.has(c.name) && c.rank !== 'guess'
  );
  const branches = node.children.filter(c => c !== spineChild);
  const left: TaxonomyNode[] = [];
  const right: TaxonomyNode[] = [];
  branches.forEach((b, i) => (i % 2 === 0 ? right : left).push(b));
  return [...left.reverse(), ...(spineChild ? [spineChild] : []), ...right];
}

/* ── Line constants ────────────────────────────────────────── */

// Spacing increased for a more "sweeping" look
const V_GAP = 16;       
const CHILD_PAD = 24;   

// Thicker lines to match Metazooa
const BASE_W = 2.5;
const SPINE_W = 4.5;

/* ── Node pill ─────────────────────────────────────────────── */

function NodePill({
  node, depth, mysteryPath, mysteryId, gameOver, selectedNodeName, isNew, onNodeClick,
}: {
  node: TaxonomyNode; depth: number; mysteryPath: string[]; mysteryId: string; gameOver: boolean;
  selectedNodeName?: string | null; isNew: boolean;
  onNodeClick?: (n: TaxonomyNode) => void;
}) {
  const isGuess = node.rank === 'guess';
  const isMystery = gameOver && node.organismId === mysteryId;
  const isSel = selectedNodeName === node.name;
  const onSpine = !isGuess && mysteryPath.includes(node.name);

  // Determine colors based on depth (guesses inherit parent's color)
  const nodeColor = getDepthColor(depth);
  const parentColor = depth > 0 ? getDepthColor(depth - 1) : nodeColor;

  let bg: string, border: string, tc: string, bw = 2;

  if (isMystery) { 
    bg = '#2e7d32'; border = '#1b5e20'; tc = '#fff'; bw = 3; // Darker green for the target
  } else if (isGuess) { 
    bg = '#ffffff'; border = parentColor; tc = parentColor; bw = 1.5; // Guesses inherit parent color
  } else if (onSpine) { 
    // Spine nodes get the solid depth color
    bg = nodeColor; border = isNew ? '#fbbf24' : nodeColor; tc = '#fff'; bw = isNew ? 3 : 2;
  } else {
    // Off-spine nodes (greyed out but visible)
    bg = '#f3f4f6'; // light grey background
    border = isNew ? '#fbbf24' : '#d1d5db'; // standard grey border, or gold if newly revealed
    tc = '#6b7280'; // medium grey text
    bw = isNew ? 3 : 2;
  }

  if (isSel) { border = '#2563eb'; bw = 3; }

  return (
    <div
      onClick={() => onNodeClick?.(node)}
      className="cursor-pointer rounded-lg px-3 py-1.5 text-center whitespace-nowrap shadow-sm select-none transition-all"
      style={{
        background: bg,
        border: `${bw}px solid ${border}`,
        minWidth: 60,
      }}
    >
      <div style={{
        color: tc,
        fontSize: 14,
        fontWeight: 700,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        lineHeight: 1.2
      }}>
        {node.name}
      </div>
      <div style={{
        color: tc === '#fff' ? 'rgba(255,255,255,0.85)' : tc,
        fontSize: 10,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        opacity: isGuess || !onSpine ? 0.8 : 1
      }}>
        {isGuess ? 'your guess' : node.rank}
      </div>
    </div>
  );
}

/* ── Recursive tree branch ─────────────────────────────────── */

function Branch({
  node, spineSet, mysteryPath, mysteryId, gameOver,
  onNodeClick, selectedNodeName, newNodes, depth,
}: {
  node: TaxonomyNode; spineSet: Set<string>;
  mysteryPath: string[]; mysteryId: string; gameOver: boolean;
  onNodeClick?: (n: TaxonomyNode) => void;
  selectedNodeName?: string | null; newNodes: string[];
  depth: number;
}) {
  const ordered = reorderChildren(node, spineSet);
  const hasKids = ordered.length > 0;

  // Does this node have a spine child?
  const hasSpineChild = ordered.some(c => spineSet.has(c.name) && c.rank !== 'guess');
  
  // The color of the branches originating from this node
  const branchColor = getDepthColor(depth + 1);

  return (
    <div className="flex flex-col items-center">
      <NodePill
        node={node} depth={depth} mysteryPath={mysteryPath} mysteryId={mysteryId} 
        gameOver={gameOver} selectedNodeName={selectedNodeName}
        isNew={newNodes.includes(node.name)} onNodeClick={onNodeClick}
      />

      {hasKids && (
        <>
          {/* Vertical gap drop from parent */}
          <div className="relative" style={{ width: SPINE_W, height: V_GAP }}>
            <div className="absolute" style={{
              left: '50%', transform: 'translateX(-50%)',
              width: hasSpineChild ? SPINE_W : BASE_W,
              height: '100%',
              background: hasSpineChild ? branchColor : getDepthColor(depth),
              borderRadius: 2
            }} />
          </div>

          {/* Children row */}
          <div className="flex items-start">
            {ordered.map((child, i) => {
              const isOnly = ordered.length === 1;
              const isFirst = i === 0;
              const isLast = i === ordered.length - 1;
              const childOnSpine = spineSet.has(child.name) && child.rank !== 'guess';
              const childIsGuess = child.rank === 'guess';

              // Vertical drop color to this specific child
              const childLineColor = childIsGuess ? getDepthColor(depth) : branchColor;

              return (
                <div
                  key={child.name + '-' + i}
                  className="relative flex flex-col items-center"
                  style={{
                    paddingTop: isOnly ? 0 : CHILD_PAD,
                    paddingLeft: 4,
                    paddingRight: 4,
                  }}
                >
                  {!isOnly && (
                    <>
                      {/* Left half of horizontal bar */}
                      {!isFirst && (
                        <div className="absolute left-0" style={{
                          top: 0, right: '50%', height: BASE_W, background: branchColor
                        }} />
                      )}
                      {/* Right half of horizontal bar */}
                      {!isLast && (
                        <div className="absolute" style={{
                          top: 0, left: '50%', right: 0, height: BASE_W, background: branchColor
                        }} />
                      )}
                      {/* Vertical stub dropping to child */}
                      <div className="absolute" style={{
                        top: 0, left: '50%', transform: 'translateX(-50%)',
                        width: childOnSpine ? SPINE_W : BASE_W, 
                        height: CHILD_PAD,
                        background: childOnSpine ? branchColor : childLineColor,
                        borderRadius: 2, zIndex: childOnSpine ? 2 : 1
                      }} />
                    </>
                  )}

                  <Branch
                    node={child} spineSet={spineSet}
                    mysteryPath={mysteryPath} mysteryId={mysteryId}
                    gameOver={gameOver} onNodeClick={onNodeClick}
                    selectedNodeName={selectedNodeName}
                    newNodes={newNodes} depth={childIsGuess ? depth : depth + 1}
                  />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Main component ────────────────────────────────────────── */

export function PhylogeneticTree({
  revealedTree, mysteryPath, mysteryId,
  onNodeClick, selectedNodeName, newNodes = [], gameOver,
}: Props) {
  const spineSet = useMemo(() => new Set(mysteryPath), [mysteryPath]);

  return (
    <div className="overflow-x-auto w-full py-6">
      <div className="inline-flex justify-center min-w-full">
        <Branch
          node={revealedTree} spineSet={spineSet}
          mysteryPath={mysteryPath} mysteryId={mysteryId}
          gameOver={gameOver} onNodeClick={onNodeClick}
          selectedNodeName={selectedNodeName}
          newNodes={newNodes} depth={0}
        />
      </div>
    </div>
  );
}