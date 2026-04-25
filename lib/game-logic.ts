import { Organism, GameState, LCAResult } from '@/types';
import { findLCA } from './taxonomy';

export function getDailyNumber(): number {
  const epoch = new Date('2025-01-01').getTime();
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - epoch) / 86400000);
}

export function getDailyOrganismIndex(organisms: Organism[]): number {
  const daysSinceEpoch = getDailyNumber();
  const hash = (daysSinceEpoch * 2654435761) >>> 0;
  return hash % organisms.length;
}

export function evaluateGuess(guess: Organism, mystery: Organism): LCAResult {
  return findLCA(guess.taxonomyPath, mystery.taxonomyPath);
}

export function createInitialState(
  mystery: Organism,
  mode: 'daily' | 'practice',
  difficulty: 'easy' | 'normal' | 'hard' = 'normal'
): GameState {
  return {
    mode,
    difficulty,
    mysteryOrganism: mystery,
    guesses: [],
    revealedNodes: ['Animalia'],
    isComplete: false,
    isWon: false,
    guessesUsed: 0,
    maxGuesses: 20,
    hintedDepths: [],
    periodRevealed: false,
    date: new Date().toDateString(),
  };
}

/* ── Recent picks tracking (no repeats for ~10 rounds) ─────── */

const RECENT_KEY_PREFIX = 'paleozooa-recent-';
const MAX_RECENT = 10;

/** Get list of recently picked organism IDs for a mode+difficulty */
export function getRecentPicks(mode: string, difficulty: string): string[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(`${RECENT_KEY_PREFIX}${mode}-${difficulty}`);
  return raw ? JSON.parse(raw) : [];
}

/** Record an organism as recently picked */
export function addRecentPick(mode: string, difficulty: string, id: string): void {
  if (typeof window === 'undefined') return;
  const recent = getRecentPicks(mode, difficulty);
  // Remove if already present, push to end
  const filtered = recent.filter(r => r !== id);
  filtered.push(id);
  // Keep only the last MAX_RECENT
  const trimmed = filtered.slice(-MAX_RECENT);
  localStorage.setItem(`${RECENT_KEY_PREFIX}${mode}-${difficulty}`, JSON.stringify(trimmed));
}

/* ── Weighted random selection (favors rarer dinos at higher difficulty) ─ */

/**
 * Pick a random organism from the pool with difficulty-based weighting.
 * - easy: uniform random (all equal weight)
 * - normal: slightly favor difficulty 2-3
 * - hard: strongly favor difficulty 2-3 (rarer organisms)
 *
 * Also excludes recently picked organisms (up to MAX_RECENT).
 * If all organisms have been recent, falls back to full pool.
 */
export function pickWeightedRandom(
  pool: Organism[],
  difficulty: 'easy' | 'normal' | 'hard',
  mode: string,
): Organism {
  const recent = new Set(getRecentPicks(mode, difficulty));

  // Filter out recent picks (unless that would leave nothing)
  let candidates = pool.filter(o => !recent.has(o.id));
  if (candidates.length === 0) candidates = pool;

  // Assign weights based on difficulty mode
  const weights = candidates.map(o => {
    const d = o.difficulty ?? 2;
    switch (difficulty) {
      case 'easy':
        // Uniform — no weighting
        return 1;
      case 'normal':
        // Slightly favor rarer (difficulty 2 gets 1.3x, difficulty 3 gets 1.6x)
        return d === 1 ? 1 : d === 2 ? 1.3 : 1.6;
      case 'hard':
        // Strongly favor rarer (difficulty 1 gets 0.5x, difficulty 2 gets 1.2x, difficulty 3 gets 2x)
        return d === 1 ? 0.5 : d === 2 ? 1.2 : 2;
      default:
        return 1;
    }
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * totalWeight;

  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }

  return candidates[candidates.length - 1];
}
