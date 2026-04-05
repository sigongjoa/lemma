interface Props {
  scores: number[]
  maxScore?: number
  width?: number
  height?: number
}

export function ScoreSparkline({ scores, maxScore = 10, width = 80, height = 30 }: Props) {
  if (scores.length < 2) {
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {scores.length === 1 && (
          <circle cx={width / 2} cy={height / 2} r={3} fill="var(--lemma-gold)" />
        )}
      </svg>
    )
  }

  const pad = 4
  const innerW = width - pad * 2
  const innerH = height - pad * 2

  const points = scores.map((s, i) => ({
    x: pad + (i / (scores.length - 1)) * innerW,
    y: pad + innerH - (s / maxScore) * innerH,
  }))

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ')
  const areaPath = `M ${points[0].x} ${pad + innerH} L ${points.map(p => `${p.x},${p.y}`).join(' L ')} L ${points[points.length - 1].x} ${pad + innerH} Z`

  const last = scores[scores.length - 1]
  const prev = scores[scores.length - 2]
  const trend = last > prev ? 'up' : last < prev ? 'down' : 'flat'

  return (
    <div className="flex items-center gap-2">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <path d={areaPath} fill="oklch(72% 0.14 75 / 0.15)" />
        <polyline points={polyline} fill="none" stroke="var(--lemma-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={3} fill="white" stroke="var(--lemma-gold)" strokeWidth="2" />
      </svg>
      <span className="text-xs font-bold" style={{ color: trend === 'up' ? 'var(--lemma-green)' : trend === 'down' ? 'var(--lemma-red)' : 'var(--lemma-ink-3)' }}>
        {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
      </span>
    </div>
  )
}
