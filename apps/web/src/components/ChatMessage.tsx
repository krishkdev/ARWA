'use client'

import { Pin, Copy, ThumbsUp, ThumbsDown } from 'lucide-react'
import ConfidenceBar from './ConfidenceBar'
import CitationChip from './CitationChip'
import type { Citation } from './CitationCard'

export interface Message {
  id: string
  answer: string
  citations: Citation[]
  confidence: number
  hallucination_risk: 'low' | 'medium' | 'high'
  role: 'assistant'
}

interface ChatMessageProps {
  message: Message
  onCitationClick?: (index: number) => void
}

export default function ChatMessage({ message, onCitationClick }: ChatMessageProps) {
  function copyText() {
    navigator.clipboard.writeText(message.answer).catch(() => {})
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Prose */}
      <p
        style={{
          margin: 0,
          color: '#1A1814',
          fontSize: 15,
          lineHeight: 1.7,
        }}
      >
        {message.answer}
      </p>

      {/* Confidence bar — mandatory on every AI response */}
      <ConfidenceBar score={message.confidence} />

      {/* Citation chips row */}
      {message.citations.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {message.citations.map((c) => (
            <CitationChip
              key={c.index}
              index={c.index}
              onClick={() => onCitationClick?.(c.index)}
            />
          ))}
        </div>
      )}

      {/* Action row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {([
          { Icon: ThumbsUp, label: 'Helpful', action: undefined as (() => void) | undefined },
          { Icon: ThumbsDown, label: 'Not helpful', action: undefined as (() => void) | undefined },
          { Icon: Pin, label: 'Pin', action: undefined as (() => void) | undefined },
          { Icon: Copy, label: 'Copy', action: copyText as (() => void) | undefined },
        ]).map(({ Icon, label, action }) => (
          <button
            key={label}
            type="button"
            title={label}
            onClick={action}
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: '#9E9992',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#6B6560')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#9E9992')}
          >
            <Icon size={16} />
          </button>
        ))}

        {message.hallucination_risk !== 'low' && (
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 11,
              color: message.hallucination_risk === 'high' ? '#C0392B' : '#C47A1A',
              fontWeight: 500,
            }}
          >
            Hallucination risk: {message.hallucination_risk}
          </span>
        )}
      </div>
    </div>
  )
}
