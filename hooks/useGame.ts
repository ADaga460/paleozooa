'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Organism, GameState } from '@/types';
import {
  createInitialState,
  getDailyOrganismIndex,
} from '@/lib/game-logic';
import { findLCA } from '@/lib/taxonomy';
import { saveGameState, loadGameState } from '@/lib/storage';
import organismsData from '@/data/organisms.json';

const allOrganisms = organismsData as Organism[];

export function useGame(mode: 'daily' | 'practice', pool: Organism[] = allOrganisms) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const initedFor = useRef<string>('');

  const startNewGame = useCallback(
    (force = false) => {
      let mystery: Organism;
      const date = new Date().toDateString();
      if (mode === 'daily') {
        if (!force) {
          const saved = loadGameState('daily', date);
          if (saved) {
            setGameState(saved);
            return;
          }
        }
        mystery = pool[getDailyOrganismIndex(pool)];
      } else {
        mystery = pool[Math.floor(Math.random() * pool.length)];
      }
      const state = createInitialState(mystery, mode);
      setGameState(state);
      saveGameState(state);
    },
    [mode, pool]
  );

  useEffect(() => {
    if (initedFor.current === mode) return;
    initedFor.current = mode;
    startNewGame();
  }, [mode, startNewGame]);

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

  const useHint = useCallback(() => {
    setGameState(prev => {
      if (!prev || prev.isComplete) return prev;
      if (prev.guessesUsed + 2 > prev.maxGuesses) return prev;

      // Find current deepest revealed depth (from guesses + existing hints)
      let currentDepth = prev.hintDepth;
      for (const guess of prev.guesses) {
        if (guess.id === prev.mysteryOrganism.id) continue;
        const lca = findLCA(guess.taxonomyPath, prev.mysteryOrganism.taxonomyPath);
        if (lca.sharedDepth > currentDepth) currentDepth = lca.sharedDepth;
      }

      const newHintDepth = currentDepth + 1;
      // Can't hint past second-to-last (genus level, one above species)
      const maxHintDepth = prev.mysteryOrganism.taxonomyPath.length - 2;
      if (newHintDepth > maxHintDepth) return prev;

      const newGuessesUsed = prev.guessesUsed + 2;
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

  return { gameState, makeGuess, useHint, startNewGame, allOrganisms };
}
