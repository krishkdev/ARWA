'use client'

export default function ThinkingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 0' }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="thinking-dot"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  )
}
