'use client';
import { useState, useCallback, useEffect } from 'react';
import { Stats, GameState } from '@/types';
import { loadStats, saveStats } from '@/lib/storage';

export function useStats() {
  const [stats, setStats] = useState<Stats>({
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    bestStreak: 0,
    guessDistribution: {},
  });

  useEffect(() => {
    setStats(loadStats());
  }, []);

  const recordResult = useCallback((state: GameState) => {
    const s = loadStats();
    s.gamesPlayed++;
    const today = new Date().toDateString();
    if (state.isWon) {
      s.gamesWon++;
      if (s.lastPlayedDate !== today) {
        s.currentStreak++;
        s.bestStreak = Math.max(s.bestStreak, s.currentStreak);
      }
      const g = state.guessesUsed;
      s.guessDistribution[g] = (s.guessDistribution[g] ?? 0) + 1;
    } else {
      s.currentStreak = 0;
    }
    s.lastPlayedDate = today;
    saveStats(s);
    setStats({ ...s });
  }, []);

  return { stats, recordResult };
}
