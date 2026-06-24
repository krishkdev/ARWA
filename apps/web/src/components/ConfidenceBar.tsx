'use client'

interface ConfidenceBarProps {
  score: number // 0–1
}

export default function ConfidenceBar({ score }: ConfidenceBarProps) {
  let color: string
  if (score > 0.75) {
    color = '#1A8A6B' // teal
  } else if (score >= 0.4) {
    color = '#C47A1A' // warning
  } else {
    color = '#C0392B' // danger
  }

  return (
    <div
      role="meter"
      aria-valuenow={Math.round(score * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{
        width: '100%',
        height: 2,
        backgroundColor: '#E2DDD6',
        borderRadius: 1,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${Math.round(score * 100)}%`,
          height: '100%',
          backgroundColor: color,
          borderRadius: 1,
          transition: 'width 0.4s ease',
        }}
      />
    </div>
  )
}
