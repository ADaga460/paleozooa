'use client';

import { track } from '@vercel/analytics';

const DEV_STATS_KEY = 'paleozooa-dev-stats';

interface DevStats {
  eventCounts: Record<string, number>;
  lastUpdated: string;
}

function getDevStats(): DevStats {
  if (typeof window === 'undefined') {
    return { eventCounts: {}, lastUpdated: new Date().toISOString() };
  }
  try {
    const raw = localStorage.getItem(DEV_STATS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore parse errors
  }
  return { eventCounts: {}, lastUpdated: new Date().toISOString() };
}

function saveDevStats(stats: DevStats): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DEV_STATS_KEY, JSON.stringify(stats));
  } catch {
    // ignore storage errors
  }
}

export function trackEvent(
  name: string,
  properties?: Record<string, string | number | boolean>
): void {
  // Send to Vercel Analytics
  try {
    track(name, properties);
  } catch {
    // Vercel Analytics may not be configured in dev
  }

  // Store in localStorage dev stats
  const stats = getDevStats();
  stats.eventCounts[name] = (stats.eventCounts[name] || 0) + 1;
  stats.lastUpdated = new Date().toISOString();
  saveDevStats(stats);

  // Also POST to dev-stats API for server-side aggregation
  try {
    fetch('/api/dev-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: name, data: properties ?? {} }),
    }).catch(() => {
      // fire and forget
    });
  } catch {
    // ignore fetch errors
  }
}

export function trackGameStart(
  mode: 'daily' | 'practice',
  difficulty: string
): void {
  trackEvent('game_start', { mode, difficulty });
}

export function trackGuess(
  mode: 'daily' | 'practice',
  difficulty: string,
  guessNumber: number,
  organismId: string,
  lcaDepth: number
): void {
  trackEvent('guess', { mode, difficulty, guessNumber, organismId, lcaDepth });
}

export function trackGameComplete(
  mode: 'daily' | 'practice',
  difficulty: string,
  won: boolean,
  guessCount: number,
  organismId: string
): void {
  trackEvent('game_complete', { mode, difficulty, won, guessCount, organismId });
}

export function trackHintUsed(
  type: 'period' | 'tree',
  mode: 'daily' | 'practice',
  difficulty: string
): void {
  trackEvent('hint_used', { type, mode, difficulty });
}

export function trackPageView(page: string): void {
  trackEvent('page_view', { page });
}
