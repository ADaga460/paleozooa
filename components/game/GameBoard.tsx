'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useGame } from '@/hooks/useGame';
import { useStats } from '@/hooks/useStats';
import { GuessInput } from './GuessInput';
import { PhylogeneticTree } from './PhylogeneticTree';
import { TaxonCard } from './TaxonCard';
import { StatsModal } from '@/components/ui/StatsModal';
import { HowToPlayModal } from '@/components/ui/HowToPlayModal';
import { Header } from '@/components/ui/Header';
import { buildGameTree, collectNodeNames, findBestLCA, findLCA } from '@/lib/taxonomy';
import { TaxonomyNode, Organism } from '@/types';
import EraTimeline from './EraTimeline';
import organismsData from '@/data/organisms.json';

const allOrganisms = organismsData as Organism[];

type Difficulty = 'easy' | 'normal' | 'hard';

function filterByDifficulty(organisms: Organism[], difficulty: Difficulty): Organism[] {
  switch (difficulty) {
    case 'easy': return organisms.filter(o => o.difficulty === 1);
    case 'normal': return organisms.filter(o => o.difficulty <= 2);
    case 'hard': return organisms;
  }
}

function useCountdown() {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    function update() {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);
  return timeLeft;
}

interface SelectedInfo {
  name: string;
  rank: string;
  organismId?: string;
}

export function GameBoard() {
  const [mode, setMode] = useState<'daily' | 'practice'>('daily');
  const [showStats, setShowStats] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [selectedInfo, setSelectedInfo] = useState<SelectedInfo | null>(null);
  const [showTable, setShowTable] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const prevNodeNamesRef = useRef<string[]>([]);
  const recordedCompleteRef = useRef<string>('');
  const prevGuessCount = useRef(0);
  const countdown = useCountdown();

  const pool = useMemo(() => filterByDifficulty(allOrganisms, difficulty), [difficulty]);
  const { gameState, makeGuess, usePeriodHint, useTreeHint, startNewGame } = useGame(mode, difficulty, pool);
  const { stats, recordResult } = useStats();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem('paleozooa-seen-howto')) {
      setShowHowTo(true);
      localStorage.setItem('paleozooa-seen-howto', '1');
    }
  }, []);

  useEffect(() => {
    if (!gameState || !gameState.isComplete) return;
    const key = `${gameState.mode}-${gameState.mysteryOrganism.id}-${
      gameState.date ?? ''
    }-${gameState.guessesUsed}`;
    if (recordedCompleteRef.current === key) return;
    recordedCompleteRef.current = key;
    recordResult(gameState);
  }, [gameState, recordResult]);

  // Clear selected node when a new guess is made
  useEffect(() => {
    if (!gameState) return;
    if (gameState.guessesUsed !== prevGuessCount.current) {
      setSelectedInfo(null);
      prevGuessCount.current = gameState.guessesUsed;
    }
  }, [gameState?.guessesUsed, gameState]);

  useEffect(() => {
    if (gameState?.isComplete) setSelectedInfo(null);
  }, [gameState?.isComplete]);

  const revealedTree = useMemo(() => {
    if (!gameState) return null;
    return buildGameTree(gameState);
  }, [gameState]);

  const currentNodeNames = useMemo(
    () => (revealedTree ? collectNodeNames(revealedTree) : []),
    [revealedTree]
  );

  const newNodes = useMemo(() => {
    const prev = prevNodeNamesRef.current;
    return currentNodeNames.filter(n => !prev.includes(n));
  }, [currentNodeNames]);

  useEffect(() => {
    prevNodeNamesRef.current = currentNodeNames;
  }, [currentNodeNames]);

  // Best-known clade: deepest LCA across ALL guesses, not just the last one
  const autoCardInfo = useMemo(() => {
    if (!gameState) return null;
    const mystery = gameState.mysteryOrganism;
    if (gameState.isComplete) {
      return {
        taxonName: mystery.wikipediaSlug.replace(/_/g, ' '),
        displayName: mystery.commonName,
        subtitle: mystery.scientificName,
        rank: 'genus',
        headline: gameState.isWon
          ? `You win! The answer is ${mystery.commonName}.`
          : `The answer was ${mystery.commonName}.`,
      };
    }
    if (gameState.guesses.length === 0 && gameState.hintDepth === 0) return null;
    // Use the DEEPEST of: best LCA across all guesses, or hint depth
    const best = gameState.guesses.length > 0
      ? findBestLCA(gameState.guesses, mystery)
      : { depth: 0 };
    const deepest = Math.max(best.depth, gameState.hintDepth);
    const taxonName = mystery.taxonomyPath[deepest];
    const rank = mystery.taxonomyRanks[deepest];
    return {
      taxonName,
      displayName: taxonName,
      subtitle: rank,
      rank,
      headline: `Best known clade: ${taxonName}`,
    };
  }, [gameState]);

  // What to display: clicked node (taxon or guess) takes priority, else auto
  const cardInfo = useMemo(() => {
    if (selectedInfo) {
      if (selectedInfo.organismId) {
        const org = allOrganisms.find(o => o.id === selectedInfo.organismId);
        if (org) {
          return {
            taxonName: org.wikipediaSlug.replace(/_/g, ' '),
            displayName: org.commonName,
            subtitle: org.scientificName,
            rank: 'genus',
            headline: `${org.commonName}`,
          };
        }
      }
      return {
        taxonName: selectedInfo.name,
        displayName: selectedInfo.name,
        subtitle: selectedInfo.rank,
        rank: selectedInfo.rank,
        headline: `${selectedInfo.rank}: ${selectedInfo.name}`,
      };
    }
    return autoCardInfo;
  }, [selectedInfo, autoCardInfo]);

  // Compute current effective depth for tree hint disabled check
  const currentEffectiveDepth = useMemo(() => {
    if (!gameState) return 0;
    let depth = gameState.hintDepth;
    for (const guess of gameState.guesses) {
      if (guess.id === gameState.mysteryOrganism.id) continue;
      const lca = findLCA(guess.taxonomyPath, gameState.mysteryOrganism.taxonomyPath);
      if (lca.sharedDepth > depth) depth = lca.sharedDepth;
    }
    return depth;
  }, [gameState]);

  const treeHintDisabled = !gameState || gameState.isComplete ||
    gameState.guessesUsed + 4 > gameState.maxGuesses ||
    currentEffectiveDepth + 1 > (gameState?.mysteryOrganism.taxonomyPath.length ?? 0) - 2;

  const periodHintDisabled = !gameState || gameState.isComplete ||
    gameState.periodRevealed ||
    gameState.guessesUsed + 1 > gameState.maxGuesses;

  const handleNodeClick = (node: TaxonomyNode) => {
    setSelectedInfo({
      name: node.name,
      rank: node.rank,
      organismId: node.organismId,
    });
  };

  if (!gameState || !revealedTree) {
    return (
      <div className="min-h-screen bg-[#f5f0e8] text-stone-500 flex items-center justify-center font-mono">
        Loading…
      </div>
    );
  }

  const guessesRemaining = gameState.maxGuesses - gameState.guessesUsed;
  const statusLine = gameState.isComplete
    ? gameState.isWon
      ? `You win! The answer is ${gameState.mysteryOrganism.commonName}. ${guessesRemaining} remaining`
      : `Out of guesses. The answer was ${gameState.mysteryOrganism.commonName}.`
    : `${guessesRemaining} guess${guessesRemaining === 1 ? '' : 'es'} remaining`;

  return (
    <div className="min-h-screen bg-[#f5f0e8] text-stone-900 flex flex-col">
      <Header
        mode={mode}
        onModeChange={setMode}
        onShowStats={() => setShowStats(true)}
        onShowHowTo={() => setShowHowTo(true)}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* LEFT COLUMN */}
          <aside className="lg:w-[400px] lg:flex-shrink-0 flex flex-col gap-4">
            <div>
              <h2 className="text-2xl font-bold text-stone-800 capitalize font-serif">
                {mode}
              </h2>
              <p className="text-sm text-stone-600 mt-1">{statusLine}</p>
              <div className="flex gap-1 mt-2">
                {(['easy', 'normal', 'hard'] as Difficulty[]).map(d => (
                  <button
                    key={d}
                    onClick={() => {
                      if (d !== difficulty) {
                        setDifficulty(d);
                      }
                    }}
                    className={`px-3 py-1 text-xs rounded-md border transition-colors capitalize ${
                      d === difficulty
                        ? 'bg-[#5a8f5a] border-[#4a7a4a] text-white'
                        : 'bg-[#e8e0d0] border-[#c4b99a] text-[#6b5c3e] hover:bg-[#ded6c4]'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {!gameState.isComplete && (
              <>
                <GuessInput
                  organisms={pool}
                  usedIds={gameState.guesses.map(g => g.id)}
                  onGuess={makeGuess}
                />
                <div className="flex gap-2">
                  <button
                    onClick={usePeriodHint}
                    disabled={periodHintDisabled}
                    className="flex-1 bg-[#e8e0d0] border border-[#c4b99a] text-[#6b5c3e] rounded-lg py-1.5 text-xs hover:bg-[#ded6c4] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {gameState.periodRevealed
                      ? `🕐 ${gameState.mysteryOrganism.timePeriod}`
                      : 'Time Period Hint (-1)'}
                  </button>
                  <button
                    onClick={useTreeHint}
                    disabled={treeHintDisabled}
                    className="flex-1 bg-[#e8e0d0] border border-[#c4b99a] text-[#6b5c3e] rounded-lg py-1.5 text-xs hover:bg-[#ded6c4] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Tree Hint (-4)
                  </button>
                </div>
              </>
            )}

            {/* Show revealed period even after hints section */}
            {gameState.periodRevealed && !gameState.isComplete && (
              <p className="text-xs text-[#6b5c3e] bg-[#ede7db] border border-[#d4cbb8] rounded-lg px-3 py-2">
                🕐 Time Period: <span className="font-semibold">{gameState.mysteryOrganism.timePeriod}</span>{' '}
                <span className="text-stone-400">({gameState.mysteryOrganism.timePeriodMya} MYA)</span>
              </p>
            )}

            {gameState.isComplete && (
              <div className="space-y-2">
                <p className="text-sm text-stone-600">
                  {mode === 'daily'
                    ? `Next puzzle in ${countdown}`
                    : 'Share your score or play again!'}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      const text = `Paleozooa ${gameState.mode} (${gameState.difficulty}) - ${gameState.isWon ? `${gameState.guessesUsed}/${gameState.maxGuesses}` : 'X/20'}`;
                      navigator.clipboard?.writeText(text);
                    }}
                    className="bg-[#e8e0d0] border border-[#c4b99a] text-[#6b5c3e] rounded-lg px-4 py-1.5 text-sm hover:bg-[#ded6c4] transition-colors flex items-center gap-1.5"
                  >
                    Share &#x2197;
                  </button>
                  <button
                    onClick={() => {
                      if (mode !== 'practice') setMode('practice');
                      else startNewGame(true);
                    }}
                    className="bg-[#5a8f5a] border-[#4a7a4a] text-white rounded-lg px-4 py-1.5 text-sm hover:bg-[#4d7d4d] transition-colors"
                  >
                    {mode === 'practice' ? 'New Game' : 'Practice'}
                  </button>
                </div>
              </div>
            )}

            <div className="text-xs text-stone-500 flex items-center gap-4">
              <span>
                Guesses:{' '}
                <span className="text-stone-800 font-semibold">
                  {gameState.guessesUsed}/{gameState.maxGuesses}
                </span>
              </span>
              <span>
                Streak:{' '}
                <span className="text-stone-800 font-semibold">{stats.currentStreak}</span>
              </span>
            </div>

            {cardInfo && (
              <TaxonCard
                key={cardInfo.taxonName}
                taxonName={cardInfo.taxonName}
                rank={cardInfo.rank}
                subtitle={cardInfo.subtitle}
                headline={cardInfo.headline}
              />
            )}

            {/* Era Timeline */}
            {gameState.guesses.length > 0 && (
              <EraTimeline
                guesses={gameState.guesses}
                mysteryOrganism={gameState.mysteryOrganism}
                periodRevealed={gameState.periodRevealed}
                isComplete={gameState.isComplete}
              />
            )}

            {gameState.guesses.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-stone-500 font-medium">Previous guesses:</p>
                {gameState.guesses.map(g => (
                  <button
                    key={g.id}
                    onClick={() =>
                      setSelectedInfo({
                        name: g.commonName,
                        rank: 'guess',
                        organismId: g.id,
                      })
                    }
                    className="w-full flex items-center justify-between text-xs bg-[#ede7db] border border-[#d4cbb8] rounded-lg px-3 py-2 hover:bg-[#e5ddd0] transition-colors cursor-pointer text-left"
                  >
                    <span className="text-stone-800 font-medium">{g.commonName}</span>
                    <span className="text-stone-500 italic">
                      {g.scientificName}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </aside>

          {/* RIGHT COLUMN: TREE */}
          <section className="flex-1 min-h-[400px]">
            <PhylogeneticTree
              revealedTree={revealedTree}
              mysteryPath={gameState.mysteryOrganism.taxonomyPath}
              mysteryId={gameState.mysteryOrganism.id}
              onNodeClick={handleNodeClick}
              selectedNodeName={selectedInfo?.name ?? null}
              newNodes={newNodes}
              gameOver={gameState.isComplete}
            />
            <div className="text-right mt-2">
              <button
                onClick={() => setShowTable(!showTable)}
                className="text-sm text-stone-500 underline hover:text-stone-700 transition-colors"
              >
                {showTable ? 'Hide table' : 'Show table'}
              </button>
            </div>
            {showTable && gameState.guesses.length > 0 && (
              <table className="mt-2 w-full text-xs border border-[#d4cbb8] rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-[#e8e0d0] text-stone-600">
                    <th className="text-left px-3 py-1.5 border-b border-[#d4cbb8]">#</th>
                    <th className="text-left px-3 py-1.5 border-b border-[#d4cbb8]">Guess</th>
                    <th className="text-left px-3 py-1.5 border-b border-[#d4cbb8]">LCA</th>
                  </tr>
                </thead>
                <tbody>
                  {gameState.guesses.map((g, i) => {
                    const mystery = gameState.mysteryOrganism;
                    const best = findBestLCA([g], mystery);
                    const lcaName = mystery.taxonomyPath[best.depth];
                    return (
                      <tr key={g.id} className="border-b border-[#e8e0d0]">
                        <td className="px-3 py-1.5 text-stone-400">{i + 1}</td>
                        <td className="px-3 py-1.5 text-stone-800">{g.commonName}</td>
                        <td className="px-3 py-1.5 text-stone-600">{g.id === mystery.id ? '\u2713' : lcaName}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </main>

      {showStats && (
        <StatsModal stats={stats} onClose={() => setShowStats(false)} />
      )}
      {showHowTo && <HowToPlayModal onClose={() => setShowHowTo(false)} />}
    </div>
  );
}
