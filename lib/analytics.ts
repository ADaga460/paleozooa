'use client';

import { track } from '@vercel/analytics';

const COLLECTOR_URL = process.env.NEXT_PUBLIC_COLLECTOR_URL || '';

// Session ID — unique per browser tab
let sessionId: string | null = null;
function getSessionId(): string {
  if (!sessionId) {
    sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
  return sessionId;
}

// Session start time for duration tracking
const sessionStart = Date.now();

export function trackEvent(
  name: string,
  properties?: Record<string, string | number | boolean>
): void {
  const payload = {
    event: name,
    data: {
      ...properties,
      sessionId: getSessionId(),
      sessionDurationMs: Date.now() - sessionStart,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.pathname : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      screenWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
      referrer: typeof document !== 'undefined' ? document.referrer : '',
    },
  };

  // Vercel Analytics
  try {
    track(name, properties);
  } catch {}

  // POST to in-app dev-stats route (in-memory, for quick local debugging)
  try {
    fetch('/api/dev-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch {}

  // POST to external collector (persistent, on Render)
  if (COLLECTOR_URL) {
    try {
      fetch(`${COLLECTOR_URL}/api/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch {}
  }
}

// --- Game events ---

export function trackGameStart(
  mode: 'daily' | 'practice',
  difficulty: string,
  organismId?: string
): void {
  trackEvent('game_start', { mode, difficulty, ...(organismId ? { mysteryId: organismId } : {}) });
}

export function trackGuess(
  mode: 'daily' | 'practice',
  difficulty: string,
  guessNumber: number,
  organismId: string,
  lcaDepth: number,
  mysteryId?: string
): void {
  trackEvent('guess', { mode, difficulty, guessNumber, organismId, lcaDepth, ...(mysteryId ? { mysteryId } : {}) });
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

// --- Navigation events ---

export function trackPageView(page: string): void {
  trackEvent('page_view', { page });
}

export function trackLearnView(organismId: string): void {
  trackEvent('learn_view', { organismId });
}

// --- Engagement events ---

export function trackShare(
  mode: 'daily' | 'practice',
  difficulty: string,
  won: boolean,
  guessCount: number
): void {
  trackEvent('share', { mode, difficulty, won, guessCount });
}

export function trackDifficultyChange(from: string, to: string): void {
  trackEvent('difficulty_change', { from, to });
}

export function trackModeChange(from: string, to: string): void {
  trackEvent('mode_change', { from, to });
}

export function trackTreeNodeClick(nodeName: string, rank: string): void {
  trackEvent('tree_node_click', { nodeName, rank });
}

// --- Error tracking ---

export function trackError(error: string, context?: string): void {
  trackEvent('error', { error: error.slice(0, 200), context: context ?? '' });
}

// --- Session lifecycle ---

export function trackSessionEnd(): void {
  trackEvent('session_end', { durationMs: Date.now() - sessionStart });
}

// Auto-track session end on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    // Use sendBeacon for reliability on unload
    if (COLLECTOR_URL && navigator.sendBeacon) {
      const payload = JSON.stringify({
        event: 'session_end',
        data: {
          sessionId: getSessionId(),
          durationMs: Date.now() - sessionStart,
          timestamp: new Date().toISOString(),
          url: window.location.pathname,
        },
      });
      navigator.sendBeacon(`${COLLECTOR_URL}/api/ingest`, payload);
    }
  });
}
