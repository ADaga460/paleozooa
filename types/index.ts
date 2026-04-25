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
  difficulty: 'easy' | 'normal' | 'hard';
  mysteryOrganism: Organism;
  guesses: Organism[];
  revealedNodes: string[];
  isComplete: boolean;
  isWon: boolean;
  guessesUsed: number;
  maxGuesses: number;
  /**
   * Spine depths (indices into mysteryOrganism.taxonomyPath) that have been
   * revealed by tree hints. Each hint click adds exactly one new depth — the
   * single "next clade" past whatever is currently visible. Does NOT imply
   * ancestors are also revealed (those come from guess LCAs, if any).
   */
  hintedDepths: number[];
  periodRevealed: boolean;
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
  gallery?: { url: string; caption: string; score: number }[];
}

export interface Stats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  bestStreak: number;
  guessDistribution: Record<number, number>;
  lastPlayedDate?: string;
}
