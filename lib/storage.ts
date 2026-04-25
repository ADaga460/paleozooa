import { GameState, Stats } from '@/types';

function keyFor(state: GameState): string {
  const diff = state.difficulty ?? 'normal';
  if (state.mode === 'daily') {
    return `paleozooa-daily-${diff}-${state.date}`;
  }
  return `paleozooa-practice-${diff}`;
}

export function saveGameState(state: GameState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(keyFor(state), JSON.stringify(state));
}

export function loadGameState(
  mode: 'daily' | 'practice',
  difficulty: 'easy' | 'normal' | 'hard',
  date?: string
): GameState | null {
  if (typeof window === 'undefined') return null;
  const key =
    mode === 'daily'
      ? `paleozooa-daily-${difficulty}-${date}`
      : `paleozooa-practice-${difficulty}`;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as Partial<GameState> & { hintDepth?: number };
  // Migrate from the old `hintDepth: number` shape. Old saves used a scalar
  // that implied "all depths from 1..hintDepth are revealed" (a chain from
  // root), but the new semantics is "each hint reveals exactly one depth".
  // For in-progress saves we preserve only the deepest hinted level — any
  // earlier hint levels implied by the old chain behavior are dropped.
  if (!Array.isArray(parsed.hintedDepths)) {
    const legacy = typeof parsed.hintDepth === 'number' && parsed.hintDepth > 0
      ? [parsed.hintDepth]
      : [];
    parsed.hintedDepths = legacy;
    delete parsed.hintDepth;
  }
  return parsed as GameState;
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
