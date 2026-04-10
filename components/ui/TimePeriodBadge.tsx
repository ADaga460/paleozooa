import { PERIOD_COLORS } from '@/lib/constants';

export function TimePeriodBadge({ period }: { period: string }) {
  const key = Object.keys(PERIOD_COLORS).find(k => period.includes(k)) ?? '';
  const color = PERIOD_COLORS[key] ?? '#6b7280';
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white"
      style={{ backgroundColor: color }}
    >
      {period}
    </span>
  );
}
