'use client';
import { useState, useRef, useEffect } from 'react';
import { Organism } from '@/types';

interface Props {
  organisms: Organism[];
  usedIds: string[];
  onGuess: (organism: Organism) => void;
  disabled?: boolean;
}

export function GuessInput({ organisms, usedIds, onGuess, disabled }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const filtered =
    query.trim().length >= 1
      ? organisms
          .filter(
            o =>
              !usedIds.includes(o.id) &&
              (o.commonName.toLowerCase().includes(query.toLowerCase()) ||
                o.scientificName.toLowerCase().includes(query.toLowerCase()))
          )
          .slice(0, 8)
      : [];

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function select(o: Organism) {
    onGuess(o);
    setQuery('');
    setOpen(false);
    setHighlighted(0);
  }

  function submitCurrent() {
    if (filtered[highlighted]) select(filtered[highlighted]);
  }

  return (
    <div className="flex items-stretch gap-2 w-full">
      <div ref={ref} className="relative flex-1">
        <input
          type="text"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlighted(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setHighlighted(h => Math.min(h + 1, filtered.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHighlighted(h => Math.max(h - 1, 0));
            } else if (e.key === 'Enter' && filtered[highlighted]) {
              e.preventDefault();
              select(filtered[highlighted]);
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
          placeholder="Type an animal name..."
          disabled={disabled}
          className="w-full bg-[#faf5eb] border border-[#c4b99a] rounded-lg px-3 py-2 text-stone-800 placeholder-[#b8a888] focus:outline-none focus:border-[#8b7a56] focus:ring-1 focus:ring-[#8b7a56] disabled:opacity-50 text-sm transition-colors"
        />
        {open && filtered.length > 0 && (
          <ul className="absolute top-full mt-1 left-0 right-0 bg-[#faf5eb] border border-[#c4b99a] rounded-lg overflow-hidden z-20 shadow-lg">
            {filtered.map((o, i) => (
              <li
                key={o.id}
                onMouseDown={e => {
                  e.preventDefault();
                  select(o);
                }}
                onMouseEnter={() => setHighlighted(i)}
                className={`px-3 py-2 cursor-pointer flex items-baseline gap-2 text-sm transition-colors ${
                  i === highlighted ? 'bg-[#e8e0d0]' : 'hover:bg-[#ede7db]'
                }`}
              >
                <span className="text-stone-800 font-medium">{o.commonName}</span>
                <span className="text-[#9a8a6a] text-xs italic">
                  {o.scientificName}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        type="button"
        onClick={submitCurrent}
        disabled={disabled || filtered.length === 0}
        className="bg-[#e8e0d0] border border-[#c4b99a] rounded-lg px-4 py-2 hover:bg-[#ded6c4] text-sm text-[#5a4a30] font-medium disabled:opacity-40 transition-colors"
      >
        Guess
      </button>
    </div>
  );
}
