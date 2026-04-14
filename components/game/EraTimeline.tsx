'use client';

import React from 'react';
import { Organism } from '@/types';

interface EraTimelineProps {
  guesses: Organism[];
  mysteryOrganism: Organism;
  periodRevealed: boolean;
  isComplete: boolean;
}

const ERA_MIN_MYA = 66;
const ERA_MAX_MYA = 252;
const ERA_RANGE = ERA_MAX_MYA - ERA_MIN_MYA;

interface EraSegment {
  label: string;
  era: string;
  startMya: number;
  endMya: number;
  color: string;
}

const SEGMENTS: EraSegment[] = [
  { label: 'Early', era: 'Triassic', startMya: 252, endMya: 237, color: '#8b5e3c' },
  { label: 'Middle', era: 'Triassic', startMya: 237, endMya: 217, color: '#9b6e4c' },
  { label: 'Late', era: 'Triassic', startMya: 217, endMya: 201, color: '#ab7e5c' },
  { label: 'Early', era: 'Jurassic', startMya: 201, endMya: 174, color: '#5b7e13' },
  { label: 'Middle', era: 'Jurassic', startMya: 174, endMya: 163, color: '#7b9e33' },
  { label: 'Late', era: 'Jurassic', startMya: 163, endMya: 145, color: '#6b8e23' },
  { label: 'Early', era: 'Cretaceous', startMya: 145, endMya: 100, color: '#c93c3c' },
  { label: 'Late', era: 'Cretaceous', startMya: 100, endMya: 66, color: '#b91c1c' },
];

function parseMya(mya: string): number {
  if (mya.includes('-')) {
    const parts = mya.split('-').map((s) => parseFloat(s.trim()));
    return (parts[0] + parts[1]) / 2;
  }
  return parseFloat(mya);
}

function myaToPercent(mya: number): number {
  // 252 MYA = 0% (left), 66 MYA = 100% (right)
  return ((ERA_MAX_MYA - mya) / ERA_RANGE) * 100;
}

function getSegmentsForPeriod(timePeriod: string): EraSegment[] {
  const lower = timePeriod.toLowerCase();
  // Check for specific sub-period first (e.g. "Late Cretaceous")
  for (const seg of SEGMENTS) {
    if (lower.includes(seg.label.toLowerCase()) && lower.includes(seg.era.toLowerCase())) {
      return [seg];
    }
  }
  // Otherwise return all segments of the matching era
  return SEGMENTS.filter((seg) => lower.includes(seg.era.toLowerCase()));
}

export default function EraTimeline({
  guesses,
  mysteryOrganism,
  periodRevealed,
  isComplete,
}: EraTimelineProps) {
  const showMystery = periodRevealed || isComplete;
  const mysterySegments = showMystery ? getSegmentsForPeriod(mysteryOrganism.timePeriod) : [];

  return (
    <div className="w-full max-w-[400px] bg-[#ede7db] border border-[#d4cbb8] rounded-lg p-3 font-mono">
      <div className="text-xs text-stone-600 font-semibold mb-2 tracking-wide uppercase">
        Era Timeline
      </div>

      {/* MYA axis labels */}
      <div className="flex justify-between text-[10px] text-stone-500 mb-1 px-0.5">
        <span>252 MYA</span>
        <span>66 MYA</span>
      </div>

      {/* Timeline bar */}
      <div className="relative h-8 flex rounded overflow-hidden border border-[#d4cbb8]">
        {SEGMENTS.map((seg, i) => {
          const widthPct = ((seg.startMya - seg.endMya) / ERA_RANGE) * 100;
          const isHighlighted = mysterySegments.includes(seg);

          return (
            <div
              key={`${seg.era}-${seg.label}`}
              className="relative h-full transition-opacity duration-300"
              style={{
                width: `${widthPct}%`,
                backgroundColor: seg.color,
                opacity: showMystery && !isHighlighted ? 0.35 : 1,
              }}
              title={`${seg.label} ${seg.era} (${seg.startMya}-${seg.endMya} MYA)`}
            >
              {isHighlighted && showMystery && (
                <div className="absolute inset-0 border-2 border-yellow-300 rounded-sm pointer-events-none animate-pulse" />
              )}
            </div>
          );
        })}

        {/* Diamond markers for guesses */}
        {guesses.map((guess, i) => {
          const mya = parseMya(guess.timePeriodMya);
          if (isNaN(mya)) return null;
          const leftPct = myaToPercent(mya);
          // Clamp to bar range
          const clamped = Math.max(0, Math.min(100, leftPct));

          return (
            <div
              key={`marker-${guess.id}-${i}`}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
              style={{ left: `${clamped}%` }}
              title={`${guess.commonName} (~${Math.round(mya)} MYA)`}
            >
              <div
                className="w-2.5 h-2.5 rotate-45 border border-white/80 shadow-sm"
                style={{ backgroundColor: '#fbbf24' }}
              />
            </div>
          );
        })}

        {/* Mystery organism marker (when revealed) */}
        {showMystery && (() => {
          const mya = parseMya(mysteryOrganism.timePeriodMya);
          if (isNaN(mya)) return null;
          const leftPct = Math.max(0, Math.min(100, myaToPercent(mya)));
          return (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20"
              style={{ left: `${leftPct}%` }}
              title={`${mysteryOrganism.commonName} (~${Math.round(mya)} MYA)`}
            >
              <div className="w-3 h-3 rotate-45 bg-white border-2 border-yellow-400 shadow-md" />
            </div>
          );
        })()}
      </div>

      {/* Era labels */}
      <div className="flex mt-1">
        {(['Triassic', 'Jurassic', 'Cretaceous'] as const).map((era) => {
          const eraSegs = SEGMENTS.filter((s) => s.era === era);
          const widthPct =
            eraSegs.reduce((sum, s) => sum + (s.startMya - s.endMya), 0) / ERA_RANGE * 100;

          return (
            <div
              key={era}
              className="text-center text-[10px] text-stone-600 leading-tight"
              style={{ width: `${widthPct}%` }}
            >
              {era}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-2 text-[10px] text-stone-500">
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-2 h-2 rotate-45"
            style={{ backgroundColor: '#fbbf24' }}
          />
          Guess
        </span>
        {showMystery && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rotate-45 bg-white border border-yellow-400" />
            Answer
          </span>
        )}
      </div>
    </div>
  );
}
