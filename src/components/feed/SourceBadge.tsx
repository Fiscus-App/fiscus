'use client'

import clsx from 'clsx'
import type { SourceCredibility } from '@/types'

interface Props {
  source: string
  credibility: SourceCredibility
  size?: 'sm' | 'md'
}

const CREDIBILITY_CONFIG: Record<
  SourceCredibility,
  { label: string; dotColor: string; className: string }
> = {
  OFFICIAL: {
    label: 'Official Source',
    dotColor: '#2ed494',
    className: 'badge-official',
  },
  TIER_1_MEDIA: {
    label: 'Tier 1 Media',
    dotColor: '#5b8af5',
    className: 'badge-tier1',
  },
  MARKET_DATA: {
    label: 'Market Data',
    dotColor: '#d4a843',
    className: 'badge-market',
  },
  OTHER: {
    label: 'Use Caution',
    dotColor: '#f97316',
    className: 'badge-other',
  },
}

export function SourceBadge({ source, credibility, size = 'sm' }: Props) {
  const cfg = CREDIBILITY_CONFIG[credibility]

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-bold uppercase tracking-wider',
        cfg.className,
        size === 'sm' ? 'text-[10px]' : 'text-xs'
      )}
    >
      <span
        className="inline-block rounded-full flex-shrink-0"
        style={{
          width: size === 'sm' ? 5 : 6,
          height: size === 'sm' ? 5 : 6,
          backgroundColor: cfg.dotColor,
        }}
      />
      {source} · {cfg.label}
    </span>
  )
}
