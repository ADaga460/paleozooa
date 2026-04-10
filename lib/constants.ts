// Warm Metazooa-style palette for tree depth
// Higher taxa = darker/more saturated; lower taxa = lighter greens
export const DEPTH_COLORS = [
  '#8b2020', // 0 - kingdom (deep red)
  '#a04030', // 1 - phylum (brown-red)
  '#b06020', // 2 - class (warm brown)
  '#c08820', // 3 - clade/order (dark gold)
  '#8a9a30', // 4 - clade (olive)
  '#5a8a3a', // 5 - family (forest green)
  '#4a7a4a', // 6 - genus (medium green)
  '#5a9a5a', // 7 (light green)
  '#6aaa6a', // 8 (lighter green)
];

export const RANK_COLORS: Record<string, string> = {
  kingdom: '#8b2020',
  phylum: '#a04030',
  class: '#b06020',
  clade: '#c08820',
  order: '#8a9a30',
  family: '#5a8a3a',
  genus: '#4a7a4a',
  species: '#6aaa6a',
};

export const PERIOD_COLORS: Record<string, string> = {
  'Late Triassic': '#8b5e3c',
  'Middle Triassic': '#9b6e4c',
  'Early Triassic': '#ab7e5c',
  'Late Jurassic': '#6b8e23',
  'Middle Jurassic': '#7b9e33',
  'Early Jurassic': '#5b7e13',
  'Late Cretaceous': '#b91c1c',
  'Early Cretaceous': '#c93c3c',
};

export const RANK_ORDER = ['kingdom', 'phylum', 'class', 'clade', 'order', 'family', 'genus', 'species'];
