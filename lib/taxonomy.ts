import { Organism, TaxonomyNode, LCAResult, GameState } from '@/types';

export function findLCA(pathA: string[], pathB: string[]): LCAResult {
  let sharedDepth = 0;
  for (let i = 0; i < Math.min(pathA.length, pathB.length); i++) {
    if (pathA[i] === pathB[i]) sharedDepth = i;
    else break;
  }
  return { lca: pathA[sharedDepth], lcaRank: '', sharedDepth };
}

export function findBestLCA(guesses: Organism[], mystery: Organism): LCAResult & { depth: number } {
  let bestDepth = 0;
  let bestLCA: LCAResult = { lca: mystery.taxonomyPath[0], lcaRank: mystery.taxonomyRanks[0], sharedDepth: 0 };
  for (const guess of guesses) {
    if (guess.id === mystery.id) continue;
    const lca = findLCA(guess.taxonomyPath, mystery.taxonomyPath);
    if (lca.sharedDepth > bestDepth) {
      bestDepth = lca.sharedDepth;
      bestLCA = lca;
    }
  }
  bestLCA.lcaRank = mystery.taxonomyRanks[bestDepth];
  return { ...bestLCA, depth: bestDepth };
}

/**
 * Build the revealed game tree, then collapse single-child chains so the
 * tree stays clean and doesn't show every intermediate clade.
 *
 * A node is collapsed when:
 *   - It has exactly 1 child
 *   - It is NOT on the mystery spine (spine nodes are always shown)
 *   - It is not a guess leaf
 *
 * This means if only one guess is under a branch (e.g. Theropoda → Tyrannosauridae → T.rex),
 * the intermediate family node gets collapsed and T.rex hangs directly off the spine.
 * But if two guesses share an intermediate (e.g. Theropoda has T.rex and Velociraptor
 * in different families), the shared Theropoda node stays because it has 2+ children.
 */
export function buildGameTree(gameState: GameState): TaxonomyNode {
  const mystery = gameState.mysteryOrganism;
  const mysteryPath = mystery.taxonomyPath;
  const mysteryRanks = mystery.taxonomyRanks;
  const wrongGuesses = gameState.guesses.filter(g => g.id !== mystery.id);

  // Collect which spine indices to show:
  //  - 0 (root) always
  //  - 0..hintDepth (hints reveal continuously)
  //  - each guess's LCA depth
  //  - if game complete: all indices
  const shownIndices = new Set<number>();
  shownIndices.add(0); // root always

  // Hints reveal a continuous chain from root
  for (let i = 0; i <= gameState.hintDepth; i++) {
    shownIndices.add(i);
  }

  // Each guess's LCA depth
  for (const guess of wrongGuesses) {
    const lca = findLCA(guess.taxonomyPath, mysteryPath);
    shownIndices.add(lca.sharedDepth);
  }

  if (gameState.isComplete) {
    for (let i = 0; i < mysteryPath.length; i++) {
      shownIndices.add(i);
    }
  }

  // Sort indices and build spine nodes only for shown indices
  const sortedIndices = Array.from(shownIndices).sort((a, b) => a - b);

  // Map from mysteryPath index → TaxonomyNode
  const spineByIndex = new Map<number, TaxonomyNode>();
  for (const idx of sortedIndices) {
    const node: TaxonomyNode = {
      name: mysteryPath[idx],
      rank: mysteryRanks[idx],
      children: [],
    };
    spineByIndex.set(idx, node);
  }

  if (gameState.isComplete) {
    const lastIdx = sortedIndices[sortedIndices.length - 1];
    const lastNode = spineByIndex.get(lastIdx)!;
    lastNode.organismId = mystery.id;
  }

  // Link spine: each shown node's parent is the previous shown node
  for (let i = 1; i < sortedIndices.length; i++) {
    const parentNode = spineByIndex.get(sortedIndices[i - 1])!;
    const childNode = spineByIndex.get(sortedIndices[i])!;
    parentNode.children.push(childNode);
  }

  // Attach wrong guesses at their LCA spine node
  const nodeMap = new Map<string, TaxonomyNode>();
  for (const idx of sortedIndices) {
    nodeMap.set(mysteryPath.slice(0, idx + 1).join('/'), spineByIndex.get(idx)!);
  }

  for (const guess of wrongGuesses) {
    const lca = findLCA(guess.taxonomyPath, mysteryPath);
    const lcaDepth = lca.sharedDepth;
    const spineParent = spineByIndex.get(lcaDepth);
    if (!spineParent) continue;

    const guessPath = guess.taxonomyPath;
    const guessRanks = guess.taxonomyRanks;

    let currentParent = spineParent;
    let pathKey = mysteryPath.slice(0, lcaDepth + 1).join('/');

    for (let d = lcaDepth + 1; d < guessPath.length; d++) {
      const nodeName = guessPath[d];
      const nodeKey = pathKey + '/' + nodeName;
      const isLeaf = d === guessPath.length - 1;

      if (isLeaf) {
        const guessNode: TaxonomyNode = {
          name: guess.commonName,
          rank: 'guess',
          children: [],
          organismId: guess.id,
        };
        currentParent.children.push(guessNode);
      } else {
        let existing = nodeMap.get(nodeKey);
        if (!existing) {
          existing = {
            name: nodeName,
            rank: guessRanks[d] ?? 'clade',
            children: [],
          };
          currentParent.children.push(existing);
          nodeMap.set(nodeKey, existing);
        }
        currentParent = existing;
        pathKey = nodeKey;
      }
    }
  }

  // Collapse single-child intermediate nodes that are NOT on the mystery spine.
  const spineNames = new Set(mysteryPath);
  collapseChains(spineByIndex.get(sortedIndices[0])!, spineNames);

  return spineByIndex.get(sortedIndices[0])!;
}

/**
 * Recursively collapse any non-spine node that has exactly one child:
 * replace it in the parent's children array with its single child.
 */
function collapseChains(node: TaxonomyNode, spineNames: Set<string>): void {
  for (const child of node.children) {
    collapseChains(child, spineNames);
  }

  const newChildren: TaxonomyNode[] = [];
  for (const child of node.children) {
    if (
      !spineNames.has(child.name) &&
      child.rank !== 'guess' &&
      !child.organismId &&
      child.children.length === 1
    ) {
      newChildren.push(child.children[0]);
    } else {
      newChildren.push(child);
    }
  }
  node.children = newChildren;
}

export function collectNodeNames(node: TaxonomyNode): string[] {
  const out: string[] = [node.name];
  for (const c of node.children) out.push(...collectNodeNames(c));
  return out;
}

export function findNodeByName(tree: TaxonomyNode, name: string): TaxonomyNode | null {
  if (tree.name === name) return tree;
  for (const child of tree.children) {
    const found = findNodeByName(child, name);
    if (found) return found;
  }
  return null;
}

export function buildFullTree(organisms: Organism[]): TaxonomyNode {
  const root: TaxonomyNode = { name: 'Animalia', rank: 'kingdom', children: [] };
  for (const o of organisms) {
    let current = root;
    for (let i = 1; i < o.taxonomyPath.length; i++) {
      const name = o.taxonomyPath[i];
      const rank = o.taxonomyRanks[i];
      let child = current.children.find(c => c.name === name);
      if (!child) {
        child = { name, rank, children: [] };
        current.children.push(child);
      }
      current = child;
    }
    current.organismId = o.id;
  }
  return root;
}
