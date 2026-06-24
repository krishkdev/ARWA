'use client'

import ReactMarkdown from 'react-markdown'
import { Pin, Copy, ThumbsUp, ThumbsDown } from 'lucide-react'
import ConfidenceBar from './ConfidenceBar'
import CitationChip from './CitationChip'
import type { Citation } from './CitationCard'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  answer: string
  citations?: Citation[]
  confidence?: number
  hallucination_risk?: 'low' | 'medium' | 'high'
  isStreaming?: boolean
}

interface ChatMessageProps {
  message: Message
  onCitationClick?: (index: number) => void
}

// Markdown element styles — prose, not a document
const md = {
  h1: { fontSize: 17, fontWeight: 600, margin: '0 0 8px', color: '#1A1814', lineHeight: 1.4 },
  h2: { fontSize: 17, fontWeight: 600, margin: '16px 0 8px', color: '#1A1814', lineHeight: 1.4 },
  h3: { fontSize: 15, fontWeight: 600, margin: '14px 0 6px', color: '#1A1814', lineHeight: 1.4 },
  p:  { margin: '0 0 12px', lineHeight: 1.7 },
  ul: { paddingLeft: 20, margin: '0 0 12px' },
  ol: { paddingLeft: 20, margin: '0 0 12px' },
  li: { marginBottom: 4, lineHeight: 1.6 },
} as const

export default function ChatMessage({ message, onCitationClick }: ChatMessageProps) {
  // ── User bubble ─────────────────────────────────────────────────────────────
  if (message.role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div
          style={{
            backgroundColor: '#F0EDE8',
            borderRadius: 12,
            padding: '12px 16px',
            maxWidth: '80%',
            fontSize: 15,
            color: '#1A1814',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
          }}
        >
          {message.answer}
        </div>
      </div>
    )
  }

  // ── Assistant response ──────────────────────────────────────────────────────
  const citations = message.citations ?? []
  const confidence = message.confidence ?? 0
  const hallucinationRisk = message.hallucination_risk ?? 'low'

  function copyText() {
    navigator.clipboard.writeText(message.answer).catch(() => {})
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Markdown prose */}
      <div style={{ fontSize: 15, color: '#1A1814', fontFamily: 'inherit' }}>
        {message.answer === '' && message.isStreaming ? (
          <span className="streaming-cursor" aria-hidden />
        ) : (
          <>
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 style={md.h1}>{children}</h1>,
                h2: ({ children }) => <h2 style={md.h2}>{children}</h2>,
                h3: ({ children }) => <h3 style={md.h3}>{children}</h3>,
                p:  ({ children }) => <p  style={md.p}>{children}</p>,
                ul: ({ children }) => <ul style={md.ul}>{children}</ul>,
                ol: ({ children }) => <ol style={md.ol}>{children}</ol>,
                li: ({ children }) => <li style={md.li}>{children}</li>,
                strong: ({ children }) => (
                  <strong style={{ fontWeight: 600, color: '#1A1814' }}>{children}</strong>
                ),
              }}
            >
              {message.answer}
            </ReactMarkdown>
            {message.isStreaming && <span className="streaming-cursor" aria-hidden />}
          </>
        )}
      </div>

      {/* Confidence bar — only after streaming completes */}
      {!message.isStreaming && <ConfidenceBar score={confidence} />}

      {/* Citation chips */}
      {!message.isStreaming && citations.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {citations.map((c) => (
            <CitationChip
              key={c.index}
              index={c.index}
              onClick={() => onCitationClick?.(c.index)}
            />
          ))}
        </div>
      )}

      {/* Action row */}
      {!message.isStreaming && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {([
            { Icon: ThumbsUp,   label: 'Helpful',     action: undefined as (() => void) | undefined },
            { Icon: ThumbsDown, label: 'Not helpful',  action: undefined as (() => void) | undefined },
            { Icon: Pin,        label: 'Pin',          action: undefined as (() => void) | undefined },
            { Icon: Copy,       label: 'Copy',         action: copyText as (() => void) | undefined },
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

          {hallucinationRisk !== 'low' && (
            <span
              style={{
                marginLeft: 'auto',
                fontSize: 11,
                color: hallucinationRisk === 'high' ? '#C0392B' : '#C47A1A',
                fontWeight: 500,
              }}
            >
              Hallucination risk: {hallucinationRisk}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
