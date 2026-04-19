import { NextResponse } from 'next/server';

// Dev-only endpoint. In production either disable entirely or require a
// bearer token, so aggregated stats + the unauthenticated POST ingest aren't
// exposed on the public site.
const IS_PROD = process.env.NODE_ENV === 'production';
const DEV_STATS_TOKEN = process.env.DEV_STATS_TOKEN ?? '';

function authorized(req: Request): boolean {
  if (!IS_PROD) return true;
  if (!DEV_STATS_TOKEN) return false; // fail closed in prod without token
  const header = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${DEV_STATS_TOKEN}`;
  // Constant-time compare to avoid timing leaks on the token.
  if (header.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < header.length; i++) {
    diff |= header.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

interface EventRecord {
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
}

interface AggregatedStats {
  totalGames: { daily: Record<string, number>; practice: Record<string, number> };
  wins: { daily: number; practice: number };
  totalGuesses: { daily: number; practice: number };
  completedGames: { daily: number; practice: number };
  firstGuesses: Record<string, number>;
  hintsUsed: { period: number; tree: number };
  pageViews: Record<string, number>;
}

// In-memory store (resets on server restart)
const eventLog: EventRecord[] = [];

function aggregate(): AggregatedStats {
  const stats: AggregatedStats = {
    totalGames: { daily: {}, practice: {} },
    wins: { daily: 0, practice: 0 },
    totalGuesses: { daily: 0, practice: 0 },
    completedGames: { daily: 0, practice: 0 },
    firstGuesses: {},
    hintsUsed: { period: 0, tree: 0 },
    pageViews: {},
  };

  for (const record of eventLog) {
    const { event, data } = record;
    const mode = (data.mode as string) === 'daily' ? 'daily' : 'practice';
    const difficulty = (data.difficulty as string) || 'normal';

    switch (event) {
      case 'game_start': {
        const modeGames = stats.totalGames[mode];
        modeGames[difficulty] = (modeGames[difficulty] || 0) + 1;
        break;
      }
      case 'guess': {
        stats.totalGuesses[mode] += 1;
        if (data.guessNumber === 1 && typeof data.organismId === 'string') {
          stats.firstGuesses[data.organismId] =
            (stats.firstGuesses[data.organismId] || 0) + 1;
        }
        break;
      }
      case 'game_complete': {
        stats.completedGames[mode] += 1;
        if (data.won) {
          stats.wins[mode] += 1;
        }
        break;
      }
      case 'hint_used': {
        const type = data.type as string;
        if (type === 'period' || type === 'tree') {
          stats.hintsUsed[type] += 1;
        }
        break;
      }
      case 'page_view': {
        const page = (data.page as string) || 'unknown';
        stats.pageViews[page] = (stats.pageViews[page] || 0) + 1;
        break;
      }
    }
  }

  return stats;
}

function computeResponse(stats: AggregatedStats) {
  const dailyCompleted = stats.completedGames.daily || 0;
  const practiceCompleted = stats.completedGames.practice || 0;
  const totalCompleted = dailyCompleted + practiceCompleted;

  const winRate =
    totalCompleted > 0
      ? ((stats.wins.daily + stats.wins.practice) / totalCompleted) * 100
      : 0;

  const totalGuessesAll = stats.totalGuesses.daily + stats.totalGuesses.practice;
  const averageGuessCount =
    totalCompleted > 0 ? totalGuessesAll / totalCompleted : 0;

  const totalGamesStarted =
    Object.values(stats.totalGames.daily).reduce((a, b) => a + b, 0) +
    Object.values(stats.totalGames.practice).reduce((a, b) => a + b, 0);

  const hintTotal = stats.hintsUsed.period + stats.hintsUsed.tree;
  const hintUsageRate =
    totalCompleted > 0 ? (hintTotal / totalCompleted) * 100 : 0;

  // Top 10 most common first guesses
  const mostCommonFirstGuesses = Object.entries(stats.firstGuesses)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([organismId, count]) => ({ organismId, count }));

  return {
    totalGamesStarted,
    totalGamesCompleted: totalCompleted,
    gamesByMode: stats.totalGames,
    winRate: Math.round(winRate * 100) / 100,
    averageGuessCount: Math.round(averageGuessCount * 100) / 100,
    mostCommonFirstGuesses,
    hintUsageRate: Math.round(hintUsageRate * 100) / 100,
    hintsUsed: stats.hintsUsed,
    pageViews: stats.pageViews,
    eventCount: eventLog.length,
  };
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const stats = aggregate();
  return NextResponse.json(computeResponse(stats));
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  // Reject oversized bodies before parsing.
  const lenHeader = request.headers.get('content-length');
  if (lenHeader && Number(lenHeader) > 16 * 1024) {
    return NextResponse.json({ error: 'payload too large' }, { status: 413 });
  }
  try {
    const body = await request.json();
    const { event, data } = body;

    if (typeof event !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "event" field' },
        { status: 400 }
      );
    }

    eventLog.push({
      event,
      data: data ?? {},
      timestamp: new Date().toISOString(),
    });

    // Cap the log at 10000 entries to prevent unbounded memory growth
    if (eventLog.length > 10000) {
      eventLog.splice(0, eventLog.length - 10000);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }
}
