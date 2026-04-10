import { GameState, Stats } from '@/types';

function keyFor(state: GameState): string {
  return state.mode === 'daily' ? `paleozooa-daily-${state.date}` : 'paleozooa-practice';
}

export function saveGameState(state: GameState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(keyFor(state), JSON.stringify(state));
}

export function loadGameState(mode: 'daily' | 'practice', date?: string): GameState | null {
  if (typeof window === 'undefined') return null;
  const key = mode === 'daily' ? `paleozooa-daily-${date}` : 'paleozooa-practice';
  const raw = localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as GameState) : null;
}

function defaultStats(): Stats {
  return { gamesPlayed: 0, gamesWon: 0, currentStreak: 0, bestStreak: 0, guessDistribution: {} };
}

export function loadStats(): Stats {
  if (typeof window === 'undefined') return defaultStats();
  const raw = localStorage.getItem('paleozooa-stats');
  return raw ? (JSON.parse(raw) as Stats) : defaultStats();
}

export function saveStats(stats: Stats): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('paleozooa-stats', JSON.stringify(stats));
}
