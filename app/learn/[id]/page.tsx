import type { Metadata } from 'next';
import organismsData from '@/data/organisms.json';
import { Organism } from '@/types';
import { OrganismDetail } from '@/components/learn/OrganismDetail';

const allOrganisms = organismsData as Organism[];

export function generateStaticParams() {
  return allOrganisms.map(o => ({ id: o.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const organism = allOrganisms.find(o => o.id === id);
  if (!organism) {
    return { title: 'Not Found - Paleozooa' };
  }

  const title = `${organism.commonName} (${organism.scientificName}) - Paleozooa`;
  const description = `Learn about ${organism.commonName}, a ${organism.timePeriod} animal (~${organism.timePeriodMya} MYA). Explore its taxonomy and evolution in Paleozooa.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      siteName: 'Paleozooa',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default async function OrganismPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const organism = allOrganisms.find(o => o.id === id);

  if (!organism) {
    return (
      <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center text-stone-500">
        Organism not found.
      </div>
    );
  }

  return <OrganismDetail organism={organism} />;
}
