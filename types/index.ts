export interface Organism {
  id: string;
  commonName: string;
  scientificName: string;
  wikipediaSlug: string;
  taxonomyPath: string[];
  taxonomyRanks: string[];
  timePeriod: string;
  timePeriodMya: string;
  tags: string[];
  difficulty: 1 | 2 | 3;
}

export interface TaxonomyNode {
  name: string;
  rank: string;
  children: TaxonomyNode[];
  organismId?: string;
}

export interface GameState {
  mode: 'daily' | 'practice';
  mysteryOrganism: Organism;
  guesses: Organism[];
  revealedNodes: string[];
  isComplete: boolean;
  isWon: boolean;
  guessesUsed: number;
  maxGuesses: number;
  hintDepth: number;
  date?: string;
}

export interface LCAResult {
  lca: string;
  lcaRank: string;
  sharedDepth: number;
}

export interface WikipediaResponse {
  title: string;
  extract: string;
  thumbnail?: { source: string; width: number; height: number };
  originalimage?: { source: string; width: number; height: number };
  content_urls?: { desktop: { page: string } };
}

export interface Stats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  bestStreak: number;
  guessDistribution: Record<number, number>;
  lastPlayedDate?: string;
}
