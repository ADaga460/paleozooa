'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Organism } from '@/types';
import organismsData from '@/data/organisms.json';
import { LearnCard } from '@/components/learn/LearnCard';

const allOrganisms = organismsData as Organism[];

interface CladeGroup {
  name: string;
  description: string;
  organisms: Organism[];
}

function buildGroups(): CladeGroup[] {
  const groups: CladeGroup[] = [
    {
      name: 'Large Theropods',
      description: 'Somehow the closest thing to chickens.',
      organisms: allOrganisms.filter(o => {
        const ids = ['tyrannosaurus','allosaurus','spinosaurus','carnotaurus','giganotosaurus','megalosaurus','majungasaurus','suchomimus','carcharodontosaurus','ceratosaurus','baryonyx','dilophosaurus','acrocanthosaurus','concavenator','neovenator','albertosaurus','tarbosaurus','irritator'];
        return ids.includes(o.id);
      }),
    },
    {
      name: 'Raptors & Small Theropods',
      description: 'Agile, small, often feathered predators... despite Jurassic Park.',
      organisms: allOrganisms.filter(o => {
        const ids = ['velociraptor','deinonychus','utahraptor','microraptor','compsognathus','coelophysis','troodon','oviraptor','gallimimus','therizinosaurus','deinocheirus','yi','sinosauropteryx','citipati'];
        return ids.includes(o.id);
      }),
    },
    {
      name: 'Early Birds',
      description: 'The true avian dinosaurs.',
      organisms: allOrganisms.filter(o => {
        const ids = ['archaeopteryx','confuciusornis','hesperornis','ichthyornis'];
        return ids.includes(o.id);
      }),
    },
    {
      name: 'The First Dinosaurs',
      description: 'The earliest known dinosaurs, from the Late Triassic.',
      organisms: allOrganisms.filter(o => {
        const ids = ['herrerasaurus','eoraptor'];
        return ids.includes(o.id);
      }),
    },
    {
      name: 'Sauropods',
      description: 'The largest land animals ever: long-necked, long-tailed herbivores.',
      organisms: allOrganisms.filter(o => o.taxonomyPath.includes('Sauropodomorpha')),
    },
    {
      name: 'Ceratopsians',
      description: 'Horned and frilled herbivores, from small bipeds the size of dogs and larger than your Mom\'s subaru',
      organisms: allOrganisms.filter(o => o.taxonomyPath.includes('Ceratopsia') || o.taxonomyPath.includes('Psittacosauridae')),
    },
    {
      name: 'Pachycephalosaurs',
      description: 'Dome-headed dinosaurs. Possibly used for head-butting displays.',
      organisms: allOrganisms.filter(o => o.taxonomyPath.includes('Pachycephalosauria')),
    },
    {
      name: 'Armored Dinosaurs',
      description: 'Stegosaurs and ankylosaurs. Beware, Thag!',
      organisms: allOrganisms.filter(o => o.taxonomyPath.includes('Thyreophora')),
    },
    {
      name: 'Ornithopods',
      description: 'Duck-billed hadrosaurs and their relatives.',
      organisms: allOrganisms.filter(o => o.taxonomyPath.includes('Ornithopoda')),
    },
    {
      name: 'Pterosaurs',
      description: 'Reptiles the size of pigeons to airplanes.',
      organisms: allOrganisms.filter(o => o.taxonomyPath.includes('Pterosauria')),
    },
    {
      name: 'Marine Reptiles',
      description: 'Bet you didn\'t know these were dinosaurs! They weren\'t. But they were cool.',
      organisms: allOrganisms.filter(o =>
        o.taxonomyPath.includes('Sauropterygia') ||
        o.taxonomyPath.includes('Ichthyosauria') ||
        o.taxonomyPath.includes('Squamata')
      ),
    },
    {
      name: 'Crocodylomorphs & Archosaurs',
      description: 'Yes, crocodiles. Not dinosaurs. Just as cool, though.',
      organisms: allOrganisms.filter(o =>
        o.taxonomyPath.includes('Pseudosuchia') ||
        o.taxonomyPath.includes('Archosauromorpha')
      ),
    },
    {
      name: 'Other Mesozoic Animals',
      description: 'Ammonites, odd reptiles, and other weird & wonderful creatures of the Mesozoic.',
      organisms: allOrganisms.filter(o => {
        const p = o.taxonomyPath;
        return !p.includes('Dinosauria') && !p.includes('Pterosauria') &&
               !p.includes('Sauropterygia') && !p.includes('Ichthyosauria') &&
               !p.includes('Squamata') && !p.includes('Pseudosuchia') &&
               !p.includes('Archosauromorpha');
      }),
    },
  ];

  // Filter out empty groups
  return groups.filter(g => g.organisms.length > 0);
}

export default function LearnPage() {
  const groups = buildGroups();
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#f5f0e8] text-stone-900">
      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-[#d4cbb8] bg-[#ede7db]">
        <div>
          <h1 className="text-lg font-bold text-stone-800 tracking-wider font-serif">
            PALEOZOOA
          </h1>
        </div>
        <Link
          href="/"
          className="bg-[#faf5eb] border border-[#d4cbb8] rounded-lg px-3 py-1 text-xs text-[#6b5c3e] hover:bg-[#e8e0d0] transition-colors"
        >
          Back to Game
        </Link>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-6">

        <div className="space-y-3">
          {groups.map(group => {
            const isOpen = openGroup === group.name;
            return (
              <div key={group.name} className="border border-[#d4cbb8] rounded-xl overflow-hidden bg-[#faf5eb]">
                <button
                  onClick={() => setOpenGroup(isOpen ? null : group.name)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#ede7db] transition-colors text-left"
                >
                  <div>
                    <h2 className="text-base font-bold text-stone-800 font-serif">{group.name}</h2>
                    <p className="text-xs text-stone-500 mt-0.5">{group.description}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <span className="text-xs text-stone-400">{group.organisms.length}</span>
                    <span className="text-stone-400 text-sm">{isOpen ? '▲' : '▼'}</span>
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-[#d4cbb8] p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {group.organisms.map(org => (
                        <LearnCard key={org.id} organism={org} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
