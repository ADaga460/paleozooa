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

      const newState: GameState = {
        ...prev,
        guesses: [...prev.guesses, guess],
        revealedNodes: [],
        isComplete,
        isWon,
        guessesUsed: newGuessesUsed,
      };
      saveGameState(newState);
      return newState;
    });
  }, []);

  // Period hint: reveals the time period, costs 1 guess
  const usePeriodHint = useCallback(() => {
    setGameState(prev => {
      if (!prev || prev.isComplete || prev.periodRevealed) return prev;
      if (prev.guessesUsed + 1 > prev.maxGuesses) return prev;

      const newGuessesUsed = prev.guessesUsed + 1;
      const isComplete = newGuessesUsed >= prev.maxGuesses;

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

  // Tree hint: reveals next clade on the spine, costs 4 guesses
  const useTreeHint = useCallback(() => {
    setGameState(prev => {
      if (!prev || prev.isComplete) return prev;
      if (prev.guessesUsed + 4 > prev.maxGuesses) return prev;

      // Find current deepest revealed depth (from guesses + existing hints)
      let currentDepth = prev.hintDepth;
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

      const newState: GameState = {
        ...prev,
        hintDepth: newHintDepth,
        guessesUsed: newGuessesUsed,
        isComplete,
      };
      saveGameState(newState);
      return newState;
    });
  }, []);

  return { gameState, makeGuess, usePeriodHint, useTreeHint, startNewGame, allOrganisms };
}
