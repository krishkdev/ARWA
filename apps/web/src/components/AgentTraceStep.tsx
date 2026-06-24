'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'

export interface TraceStep {
  name: 'PLAN' | 'RETRIEVE' | 'REASON' | 'TOOL' | 'VERIFY'
  status: 'complete' | 'active' | 'pending' | 'error'
  description: string
  duration_ms: number | null
  payload?: object
}

interface AgentTraceStepProps {
  step: TraceStep
}

function StatusDot({ status }: { status: TraceStep['status'] }) {
  if (status === 'complete') return <span style={{ color: '#1A7A4A', fontSize: 14 }}>✓</span>
  if (status === 'active')   return <span style={{ color: '#4F6EF7', fontSize: 14, display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
  if (status === 'error')    return <span style={{ color: '#C0392B', fontSize: 14 }}>✗</span>
  return <span style={{ color: '#9E9992', fontSize: 14 }}>○</span>
}

function syntaxHighlight(json: string) {
  return json
    .replace(/("[\w\s]+")\s*:/g, '<span style="color:#4F6EF7">$1</span>:')
    .replace(/:\s*(".*?")/g, ': <span style="color:#1A8A6B">$1</span>')
    .replace(/:\s*(\d+\.?\d*)/g, ': <span style="color:#C47A1A">$1</span>')
    .replace(/:\s*(true|false|null)/g, ': <span style="color:#9E9992">$1</span>')
}

export default function AgentTraceStep({ step }: AgentTraceStepProps) {
  const [expanded, setExpanded] = useState(false)
  const hasPayload = step.payload && Object.keys(step.payload).length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: hasPayload ? 'pointer' : 'default' }}
        onClick={() => hasPayload && setExpanded(v => !v)}
      >
        <StatusDot status={step.status} />

        <span
          style={{
            fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
            fontSize: 11,
            fontWeight: 400,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#1A1814',
            minWidth: 72,
          }}
        >
          {step.name}
        </span>

        <div style={{ flex: 1, height: 1, backgroundColor: '#E2DDD6' }} />

        {step.duration_ms !== null ? (
          <span style={{ fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace', fontSize: 11, color: '#9E9992' }}>
            {step.duration_ms}ms
          </span>
        ) : (
          <span style={{ fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace', fontSize: 11, color: '#9E9992' }}>—</span>
        )}

        {hasPayload && (
          <ChevronRight
            size={14}
            color="#9E9992"
            style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}
          />
        )}
      </div>

      <p
        style={{
          fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
          fontSize: 12,
          color: '#6B6560',
          margin: '0 0 0 22px',
          lineHeight: 1.5,
        }}
      >
        &ldquo;{step.description}&rdquo;
      </p>

      {expanded && hasPayload && (
        <pre
          style={{
            margin: '4px 0 0 22px',
            padding: '8px 12px',
            backgroundColor: '#F0EDE8',
            borderRadius: 8,
            fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
            fontSize: 11,
            lineHeight: 1.6,
            overflow: 'auto',
            color: '#1A1814',
          }}
          dangerouslySetInnerHTML={{
            __html: syntaxHighlight(JSON.stringify(step.payload, null, 2)),
          }}
        />
      )}
    </div>
  )
}
