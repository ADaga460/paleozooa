'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Organism, GameState } from '@/types';
import {
  createInitialState,
  getDailyOrganismIndex,
  pickWeightedRandom,
  addRecentPick,
} from '@/lib/game-logic';
import { findLCA } from '@/lib/taxonomy';
import { saveGameState, loadGameState } from '@/lib/storage';
import { trackGameStart, trackGuess, trackGameComplete, trackHintUsed } from '@/lib/analytics';
import organismsData from '@/data/organisms.json';

const allOrganisms = organismsData as Organism[];

type Difficulty = 'easy' | 'normal' | 'hard';

export function useGame(
  mode: 'daily' | 'practice',
  difficulty: Difficulty,
  pool: Organism[]
) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const initedFor = useRef<string>('');

  const startNewGame = useCallback(
    (force = false) => {
      const date = new Date().toDateString();
      const stateKey = `${mode}-${difficulty}`;

      // Always try to restore saved state first (unless forced)
      if (!force) {
        const saved = loadGameState(mode, difficulty, date);
        if (saved) {
          setGameState(saved);
          initedFor.current = stateKey;
          return;
        }
      }

      let mystery: Organism;
      if (mode === 'daily') {
        mystery = pool[getDailyOrganismIndex(pool)];
      } else {
        // Weighted random: favors rarer dinos at higher difficulty, avoids recent picks
        mystery = pickWeightedRandom(pool, difficulty, mode);
      }

      // Track this pick so it doesn't repeat for ~10 rounds
      addRecentPick(mode, difficulty, mystery.id);

      const state = createInitialState(mystery, mode, difficulty);
      setGameState(state);
      saveGameState(state);
      initedFor.current = stateKey;
      trackGameStart(mode, difficulty, mystery.id);
    },
    [mode, difficulty, pool]
  );

  useEffect(() => {
    const stateKey = `${mode}-${difficulty}`;
    if (initedFor.current === stateKey) return;
    startNewGame();
  }, [mode, difficulty, startNewGame]);

  const makeGuess = useCallback((guess: Organism) => {
    setGameState(prev => {
      if (!prev || prev.isComplete) return prev;
      if (prev.guesses.find(g => g.id === guess.id)) return prev;

      const isWon = guess.id === prev.mysteryOrganism.id;
      const newGuessesUsed = prev.guessesUsed + 1;
      const isComplete = isWon || newGuessesUsed >= prev.maxGuesses;

      const lca = findLCA(guess.taxonomyPath, prev.mysteryOrganism.taxonomyPath);
      trackGuess(prev.mode, prev.difficulty, newGuessesUsed, guess.id, lca.sharedDepth, prev.mysteryOrganism.id);

      const newState: GameState = {
        ...prev,
        guesses: [...prev.guesses, guess],
        revealedNodes: [],
        isComplete,
        isWon,
        guessesUsed: newGuessesUsed,
      };
      saveGameState(newState);

      if (isComplete) {
        trackGameComplete(prev.mode, prev.difficulty, isWon, newGuessesUsed, prev.mysteryOrganism.id);
      }

      return newState;
    });
  }, []);

  // Period hint: reveals the time period, costs 1 guess.
  // Require at least 1 guess to remain after spending — otherwise the hint
  // itself would push guessesUsed to maxGuesses, mark the game complete, and
  // reveal the answer leaf in buildGameTree (defeating the point of the hint).
  const usePeriodHint = useCallback(() => {
    setGameState(prev => {
      if (!prev || prev.isComplete || prev.periodRevealed) return prev;
      if (prev.guessesUsed + 1 >= prev.maxGuesses) return prev;

      const newGuessesUsed = prev.guessesUsed + 1;
      const isComplete = newGuessesUsed >= prev.maxGuesses;

      trackHintUsed('period', prev.mode, prev.difficulty);

      const newState: GameState = {
        ...prev,
        periodRevealed: true,
        guessesUsed: newGuessesUsed,
        isComplete,
      };
      saveGameState(newState);
      return newState;
    });
  }, []);

  // Tree hint: reveals next clade on the spine, costs 4 guesses.
  // Require at least 1 guess to remain after spending — see usePeriodHint
  // comment. Without this, the hint at usedGuesses=16 (with maxGuesses=20)
  // pushes us to 20, isComplete flips true, and buildGameTree reveals the
  // mystery's leaf node — the user sees "the entire chain to the answer"
  // and reasonably reports it as a hint bug.
  const useTreeHint = useCallback(() => {
    setGameState(prev => {
      if (!prev || prev.isComplete) return prev;
      if (prev.guessesUsed + 4 >= prev.maxGuesses) return prev;

      // Find current deepest revealed depth (from guesses + existing hints)
      let currentDepth = prev.hintedDepths.length > 0 ? Math.max(...prev.hintedDepths) : 0;
      for (const guess of prev.guesses) {
        if (guess.id === prev.mysteryOrganism.id) continue;
        const lca = findLCA(guess.taxonomyPath, prev.mysteryOrganism.taxonomyPath);
        if (lca.sharedDepth > currentDepth) currentDepth = lca.sharedDepth;
      }

      const newHintDepth = currentDepth + 1;
      const maxHintDepth = prev.mysteryOrganism.taxonomyPath.length - 2;
      if (newHintDepth > maxHintDepth) return prev;

      const newGuessesUsed = prev.guessesUsed + 4;
      const isComplete = newGuessesUsed >= prev.maxGuesses;

      trackHintUsed('tree', prev.mode, prev.difficulty);

      const newState: GameState = {
        ...prev,
        // Append the specific depth this hint reveals. We never lose earlier
        // hinted depths even when a later guess's LCA goes deeper.
        hintedDepths: [...prev.hintedDepths, newHintDepth],
        guessesUsed: newGuessesUsed,
        isComplete,
      };
      saveGameState(newState);
      return newState;
    });
  }, []);

  return { gameState, makeGuess, usePeriodHint, useTreeHint, startNewGame, allOrganisms };
}
