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

/* ── Node pill ─────────────────────────────────────────────── */

function NodePill({
  node, depth, mysteryPath, mysteryId, gameOver,
  selectedNodeName, isNew, onNodeClick,
}: {
  node: TaxonomyNode; depth: number; mysteryPath: string[];
  mysteryId: string; gameOver: boolean;
  selectedNodeName?: string | null; isNew: boolean;
  onNodeClick?: (n: TaxonomyNode) => void;
}) {
  const isGuess = node.rank === 'guess';
  const isMystery = gameOver && node.organismId === mysteryId;
  const onSpine = !isGuess && mysteryPath.includes(node.name);
  const isSel = selectedNodeName === node.name;

  let bg: string, border: string, tc: string, bw = 2;
  if (isMystery) { bg = '#5a9a5a'; border = '#3a7a3a'; tc = '#fff'; bw = 3; }
  else if (isGuess) { bg = '#faf5eb'; border = '#c4b99a'; tc = '#6b5c3e'; bw = 1.5; }
  else if (onSpine) {
    bg = getDepthColor(depth); border = isNew ? '#fbbf24' : bg; tc = '#fff';
    bw = isNew ? 3 : 2;
  } else { bg = '#ede7db'; border = '#c4b99a'; tc = '#5a4a30'; }
  if (isSel) { border = '#2563eb'; bw = 3; }

  return (
    <div
      onClick={() => onNodeClick?.(node)}
      className="cursor-pointer rounded-lg px-2 py-0.5 text-center whitespace-nowrap shadow-sm select-none"
      style={{
        background: bg,
        border: `${bw}px solid ${border}`,
        minWidth: 50,
      }}
    >
      <div style={{
        color: tc,
        fontSize: 13,
        fontWeight: 700,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      }}>
        {node.name}
      </div>
      <div style={{
        color: tc === '#fff' ? 'rgba(255,255,255,0.6)' : '#a89a7a',
        fontSize: 9,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      }}>
        {isGuess ? 'your guess' : node.rank}
      </div>
    </div>
  );
}

/* ── Line constants ────────────────────────────────────────── */

// Base connector lines (subtle, thin)
const BASE_COLOR = '#d4cbb8';
const BASE_W = 1.5;

// Spine overlay (bold, prominent gold)
const SPINE_COLOR = '#8b6914';
const SPINE_W = 3.5;

// Spacing
const V_GAP = 6;        // vertical connector from parent pill down to horizontal bar
const CHILD_PAD = 10;   // padding-top on each child wrapper (horiz bar + vertical stub)

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
  const nodeOnSpine = spineSet.has(node.name) && node.rank !== 'guess';

  // Does this node have a spine child?
  const hasSpineChild = ordered.some(c => spineSet.has(c.name) && c.rank !== 'guess');

  return (
    <div className="flex flex-col items-center">
      {/* The node pill */}
      <NodePill
        node={node} depth={depth} mysteryPath={mysteryPath}
        mysteryId={mysteryId} gameOver={gameOver}
        selectedNodeName={selectedNodeName}
        isNew={newNodes.includes(node.name)}
        onNodeClick={onNodeClick}
      />

      {hasKids && (
        <>
          {/* Vertical line from parent pill down to the horizontal bar */}
          <div className="relative" style={{ width: 6, height: V_GAP }}>
            {/* Base line (always) */}
            <div className="absolute" style={{
              left: '50%', transform: 'translateX(-0.75px)',
              width: BASE_W, height: '100%', background: BASE_COLOR,
            }} />
            {/* Spine overlay (if this node is on spine and has a spine child below) */}
            {nodeOnSpine && hasSpineChild && (
              <div className="absolute" style={{
                left: '50%', transform: `translateX(-${SPINE_W / 2}px)`,
                width: SPINE_W, height: '100%', background: SPINE_COLOR,
                borderRadius: 2, zIndex: 2,
              }} />
            )}
          </div>

          {/* Children row */}
          <div className="flex items-start">
            {ordered.map((child, i) => {
              const isOnly = ordered.length === 1;
              const isFirst = i === 0;
              const isLast = i === ordered.length - 1;
              const childOnSpine = spineSet.has(child.name) && child.rank !== 'guess';

              return (
                <div
                  key={child.name + '-' + i}
                  className="relative flex flex-col items-center"
                  style={{
                    paddingTop: isOnly ? 0 : CHILD_PAD,
                    paddingLeft: 1,
                    paddingRight: 1,
                  }}
                >
                  {/* Connector lines for multi-child layouts */}
                  {!isOnly && (
                    <>
                      {/* ─── BASE LAYER (thin, subtle) ─── */}
                      {/* Left half of horizontal bar */}
                      {!isFirst && (
                        <div className="absolute left-0" style={{
                          top: 0, right: '50%',
                          height: BASE_W, background: BASE_COLOR,
                        }} />
                      )}
                      {/* Right half of horizontal bar */}
                      {!isLast && (
                        <div className="absolute" style={{
                          top: 0, left: '50%', right: 0,
                          height: BASE_W, background: BASE_COLOR,
                        }} />
                      )}
                      {/* Vertical stub from bar down to child */}
                      <div className="absolute" style={{
                        top: 0, left: '50%', transform: 'translateX(-0.75px)',
                        width: BASE_W, height: CHILD_PAD,
                        background: BASE_COLOR,
                      }} />

                      {/* ─── SPINE OVERLAY (bold gold, only on vertical stub) ─── */}
                      {childOnSpine && (
                        <div className="absolute" style={{
                          top: 0, left: '50%', transform: `translateX(-${SPINE_W / 2}px)`,
                          width: SPINE_W, height: CHILD_PAD,
                          background: SPINE_COLOR,
                          borderRadius: 2, zIndex: 2,
                        }} />
                      )}
                    </>
                  )}

                  {/* Recurse into child */}
                  <Branch
                    node={child} spineSet={spineSet}
                    mysteryPath={mysteryPath} mysteryId={mysteryId}
                    gameOver={gameOver} onNodeClick={onNodeClick}
                    selectedNodeName={selectedNodeName}
                    newNodes={newNodes} depth={depth + 1}
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
    <div className="overflow-x-auto w-full py-3">
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
