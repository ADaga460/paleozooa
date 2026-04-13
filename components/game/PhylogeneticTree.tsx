'use client';
import { useMemo } from 'react';
import { hierarchy, HierarchyPointNode } from 'd3-hierarchy';
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
 * Custom layout: position nodes manually for a Metazooa-style feel.
 *
 * - Each layer gets a staggered y offset so siblings aren't perfectly
 *   aligned — gives an organic "2 rungs per step" feel.
 * - Generous vertical and horizontal spacing.
 */
interface LayoutNode {
  x: number;
  y: number;
  data: TaxonomyNode;
  depth: number;
  parent: LayoutNode | null;
}

function layoutTree(root: TaxonomyNode, mysteryPath: string[]): {
  nodes: LayoutNode[];
  links: { source: LayoutNode; target: LayoutNode }[];
  width: number;
  height: number;
} {
  const h = hierarchy<TaxonomyNode>(root, d =>
    d.children.length > 0 ? d.children : null
  );

  const ROW_HEIGHT = 110;       // vertical spacing between layers
  const STAGGER = 28;           // y offset for alternating siblings
  const MIN_NODE_WIDTH = 160;   // horizontal spacing per leaf

  const leafCount = Math.max(1, h.leaves().length);
  const totalWidth = Math.max(500, leafCount * MIN_NODE_WIDTH);
  const totalHeight = Math.max(300, (h.height + 1) * ROW_HEIGHT + STAGGER * 2 + 60);

  // First pass: assign x ranges to each subtree based on leaf count
  const nodes: LayoutNode[] = [];
  const links: { source: LayoutNode; target: LayoutNode }[] = [];

  function countLeaves(node: TaxonomyNode): number {
    if (node.children.length === 0) return 1;
    let sum = 0;
    for (const c of node.children) sum += countLeaves(c);
    return sum;
  }

  function layout(
    node: TaxonomyNode,
    depth: number,
    xMin: number,
    xMax: number,
    parentLayout: LayoutNode | null,
    siblingIndex: number,
  ): LayoutNode {
    const isOnSpine = mysteryPath.includes(node.name) && node.rank !== 'guess';

    // Y position: base row + stagger for non-spine siblings
    const baseY = 40 + depth * ROW_HEIGHT;
    const staggerOffset = (!isOnSpine && siblingIndex % 2 === 1) ? STAGGER : 0;
    const y = baseY + staggerOffset;

    const x = (xMin + xMax) / 2;

    const layoutNode: LayoutNode = {
      x,
      y,
      data: node,
      depth,
      parent: parentLayout,
    };
    nodes.push(layoutNode);

    if (parentLayout) {
      links.push({ source: parentLayout, target: layoutNode });
    }

    if (node.children.length > 0) {
      const totalLeaves = countLeaves(node);
      let currentX = xMin;

      node.children.forEach((child, i) => {
        const childLeaves = countLeaves(child);
        const childWidth = (childLeaves / totalLeaves) * (xMax - xMin);
        layout(child, depth + 1, currentX, currentX + childWidth, layoutNode, i);
        currentX += childWidth;
      });
    }

    return layoutNode;
  }

  layout(root, 0, 60, totalWidth - 60, null, 0);

  return { nodes, links, width: totalWidth, height: totalHeight };
}

export function PhylogeneticTree({
  revealedTree,
  mysteryPath,
  mysteryId,
  onNodeClick,
  selectedNodeName,
  newNodes = [],
  gameOver,
}: Props) {
  const { nodes, links, width, height } = useMemo(
    () => layoutTree(revealedTree, mysteryPath),
    [revealedTree, mysteryPath]
  );

  return (
    <div className="overflow-auto w-full">
      <svg width={width} height={height} className="mx-auto block">
        <defs>
          <filter id="nodeShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#00000018" />
          </filter>
        </defs>
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.85); }
            to { opacity: 1; transform: scale(1); }
          }
          .tree-node-new rect {
            animation: fadeIn 0.4s ease-out;
          }
        `}</style>
        <g>
          {links.map((link, i) => {
            const isSpineLink =
              mysteryPath.includes(link.source.data.name) &&
              mysteryPath.includes(link.target.data.name);
            // Curved path with a natural bend
            const sx = link.source.x;
            const sy = link.source.y;
            const tx = link.target.x;
            const ty = link.target.y;
            const midY = (sy + ty) / 2;
            return (
              <path
                key={i}
                d={`M${sx},${sy + 16} C${sx},${midY} ${tx},${midY} ${tx},${ty - 16}`}
                fill="none"
                stroke={isSpineLink ? '#8b6914' : '#c4b090'}
                strokeWidth={isSpineLink ? 2.5 : 1.5}
                opacity={isSpineLink ? 0.85 : 0.45}
              />
            );
          })}
          {nodes.map((node, i) => {
            const d = node.data;
            const isGuess = d.rank === 'guess';
            const isMysteryLeaf = gameOver && d.organismId === mysteryId;
            const isOnMysteryPath = !isGuess && mysteryPath.includes(d.name);
            const isNew = newNodes.includes(d.name);
            const isSelected = selectedNodeName === d.name;

            let fill: string;
            let stroke: string;
            let textColor: string;
            let strokeW = 1.5;

            if (isMysteryLeaf) {
              fill = '#5a9a5a';
              stroke = '#3a7a3a';
              textColor = '#ffffff';
              strokeW = 2.5;
            } else if (isGuess) {
              fill = '#faf5eb';
              stroke = '#c4b99a';
              textColor = '#6b5c3e';
              strokeW = 1;
            } else if (isOnMysteryPath) {
              fill = getDepthColor(node.depth);
              stroke = isNew ? '#fbbf24' : getDepthColor(node.depth);
              textColor = '#ffffff';
              strokeW = isNew ? 2.5 : 1.5;
            } else {
              fill = '#ede7db';
              stroke = '#c4b99a';
              textColor = '#5a4a30';
              strokeW = 1.5;
            }

            if (isSelected) {
              stroke = '#2563eb';
              strokeW = 3;
            }

            const label = d.name;
            const displayLabel =
              label.length > 18 ? label.slice(0, 17) + '\u2026' : label;
            const boxWidth = Math.max(90, displayLabel.length * 7.5 + 28);

            return (
              <g
                key={i}
                transform={`translate(${node.x},${node.y})`}
                className={isNew ? 'tree-node-new' : ''}
                onClick={() => onNodeClick?.(d)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x={-boxWidth / 2}
                  y={-16}
                  width={boxWidth}
                  height={32}
                  rx={10}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={strokeW}
                  filter="url(#nodeShadow)"
                />
                <text
                  x={0}
                  y={-2}
                  textAnchor="middle"
                  fill={textColor}
                  fontSize={11}
                  fontWeight={600}
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {displayLabel}
                </text>
                <text
                  x={0}
                  y={10}
                  textAnchor="middle"
                  fill={textColor === '#ffffff' ? 'rgba(255,255,255,0.55)' : '#a89a7a'}
                  fontSize={8}
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {isGuess ? 'your guess' : d.rank}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}