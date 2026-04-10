import { Organism, GameState, LCAResult } from '@/types';
import { findLCA } from './taxonomy';

export function getDailyOrganismIndex(organisms: Organism[]): number {
  const epoch = new Date('2025-01-01').getTime();
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const daysSinceEpoch = Math.floor((now.getTime() - epoch) / 86400000);
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
    hintDepth: 0,
    periodRevealed: false,
    date: new Date().toDateString(),
  };
}
