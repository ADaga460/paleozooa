import type { Metadata } from 'next';
import { GameBoard } from '@/components/game/GameBoard';
import { getDailyNumber } from '@/lib/game-logic';

const dailyNumber = getDailyNumber();
export const metadata: Metadata = {
  title: `Animal #${dailyNumber}`,
  description:
    'Guess the mystery dinosaur each day by exploring a phylogenetic tree. A Wordle-style daily puzzle for Mesozoic animals.',
  alternates: {
    canonical: '/',
  },
};

export default function Home() {
  return (
    <>
      {/* Pre-rendered structured data for search engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'Paleozooa',
            description:
              'A daily taxonomy guessing game featuring Mesozoic animals. Guess the mystery dinosaur using phylogenetic tree clues.',
            applicationCategory: 'Game',
            genre: 'Educational',
            operatingSystem: 'Web',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          }),
        }}
      />
      <GameBoard />
    </>
  );
}
