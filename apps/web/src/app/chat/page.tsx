'use client'

import { useState } from 'react'
import { Plus, Activity } from 'lucide-react'

import PdfIcon from '@/components/PdfIcon'
import DocumentRow from '@/components/DocumentRow'
import CitationCard from '@/components/CitationCard'
import ChatMessage from '@/components/ChatMessage'
import ChatInput from '@/components/ChatInput'
import SuggestedQuestion from '@/components/SuggestedQuestion'
import AgentTraceStep from '@/components/AgentTraceStep'

import type { DocumentMeta } from '@/components/DocumentRow'
import type { Message } from '@/components/ChatMessage'
import type { Citation } from '@/components/CitationCard'
import type { TraceStep } from '@/components/AgentTraceStep'

// ── Placeholder data ────────────────────────────────────────────────────────

const PLACEHOLDER_DOCS: DocumentMeta[] = [
  {
    id: 'doc-1',
    filename: 'climate-report-2024.pdf',
    page_count: 48,
    uploaded_at: '2026-06-20T10:00:00Z',
    status: 'indexed',
  },
  {
    id: 'doc-2',
    filename: 'methodology-appendix.pdf',
    page_count: 12,
    uploaded_at: '2026-06-22T14:30:00Z',
    status: 'processing',
  },
]

const PLACEHOLDER_CITATIONS: Citation[] = [
  {
    index: 1,
    document_id: 'doc-1',
    filename: 'climate-report-2024.pdf',
    page: 14,
    excerpt:
      'Global average temperatures have risen by 1.2°C above pre-industrial levels, accelerating the frequency of extreme weather events across multiple regions.',
    relevance_score: 0.92,
  },
  {
    index: 2,
    document_id: 'doc-1',
    filename: 'climate-report-2024.pdf',
    page: 27,
    excerpt:
      'Sea levels are projected to rise between 0.3 and 1.0 metres by 2100 under current emission trajectories, posing risks to coastal populations.',
    relevance_score: 0.78,
  },
  {
    index: 3,
    document_id: 'doc-1',
    filename: 'climate-report-2024.pdf',
    page: 33,
    excerpt:
      'Arctic ice coverage declined by 13% per decade since 1979, with nine of the ten lowest extents recorded in the last decade.',
    relevance_score: 0.65,
  },
]

const PLACEHOLDER_MESSAGES: Message[] = [
  {
    id: 'msg-1',
    answer:
      'The report identifies three primary drivers of accelerating climate change: industrial emissions, deforestation, and methane from agriculture. **Global temperatures** have risen 1.2°C above pre-industrial levels, with the last decade recording the highest average temperatures since records began. The findings underscore an urgent need for systemic policy intervention across all major economies.',
    citations: PLACEHOLDER_CITATIONS,
    confidence: 0.87,
    hallucination_risk: 'low',
    role: 'assistant',
  },
]

const PLACEHOLDER_TRACE: TraceStep[] = [
  { name: 'PLAN',     status: 'complete', description: 'Decomposing into 2 sub-questions', duration_ms: 23, payload: { sub_questions: ['What are the primary drivers?', 'What are the key findings?'] } },
  { name: 'RETRIEVE', status: 'complete', description: 'Fetching top-5 chunks · confidence 0.87', duration_ms: 142, payload: { chunks: 5, avg_score: 0.87 } },
  { name: 'REASON',   status: 'complete', description: 'Cross-referencing chunk 3 with chunk 1', duration_ms: 89, payload: null as unknown as object },
  { name: 'TOOL',     status: 'pending',  description: 'No tool calls required', duration_ms: null },
  { name: 'VERIFY',   status: 'complete', description: 'Hallucination risk: LOW', duration_ms: 34, payload: { risk: 'low', score: 0.04 } },
]

const SUGGESTED_QUESTIONS = [
  'Summarize this document',
  'What are the key findings?',
  'What methodology was used?',
]

// ── Component ───────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [activeDocId, setActiveDocId] = useState('doc-1')
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set(['doc-1']))
  const [showTrace, setShowTrace] = useState(false)
  const [messages, setMessages] = useState<Message[]>(PLACEHOLDER_MESSAGES)

  const activeDoc = PLACEHOLDER_DOCS.find((d) => d.id === activeDocId)

  function toggleSelected(id: string) {
    setSelectedDocIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSend(text: string) {
    // Placeholder: no API yet
    const stub: Message = {
      id: `msg-${Date.now()}`,
      answer: `(Placeholder response to: "${text}") — API integration coming in Session 2.`,
      citations: PLACEHOLDER_CITATIONS.slice(0, 1),
      confidence: 0.5,
      hallucination_risk: 'medium',
      role: 'assistant',
    }
    setMessages((prev) => [...prev, stub])
  }

  return (
    <div
      data-theme="dark"
      style={{
        display: 'flex',
        height: '100vh',
        backgroundColor: 'var(--color-page)',
        color: 'var(--color-text-primary)',
        overflow: 'hidden',
      }}
    >
      {/* ── Left panel: Sources ─────────────────────────────────── */}
      <aside
        style={{
          width: 256,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface)',
          overflow: 'hidden',
        }}
      >
        {/* Panel header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 12px 12px',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--color-text-secondary)',
            }}
          >
            Sources
          </span>
          <button
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              backgroundColor: 'transparent',
              color: 'var(--color-text-secondary)',
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border-hover)'
              e.currentTarget.style.color = 'var(--color-text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)'
              e.currentTarget.style.color = 'var(--color-text-secondary)'
            }}
          >
            <Plus size={14} />
            Add
          </button>
        </div>

        {/* Document list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {PLACEHOLDER_DOCS.map((doc) => (
            <DocumentRow
              key={doc.id}
              document={doc}
              active={doc.id === activeDocId}
              selected={selectedDocIds.has(doc.id)}
              onClick={setActiveDocId}
              onSelect={toggleSelected}
            />
          ))}
        </div>
      </aside>

      {/* ── Center panel: Chat ──────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        {/* Center top bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 24px',
            borderBottom: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            flexShrink: 0,
          }}
        >
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {activeDoc && <PdfIcon size={16} />}
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
              {activeDoc?.filename ?? 'No document selected'}
            </span>
          </div>

          {/* Agent trace toggle */}
          <button
            type="button"
            onClick={() => setShowTrace((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 20,
              border: '1px solid var(--color-border)',
              backgroundColor: showTrace ? '#EEF1FE' : 'transparent',
              color: showTrace ? '#4F6EF7' : 'var(--color-text-secondary)',
              fontSize: 13,
              fontFamily: 'inherit',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <Activity size={14} />
            Agent trace
          </button>
        </div>

        {/* Messages / Trace area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {showTrace ? (
            /* Agent trace view */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 640 }}>
              {PLACEHOLDER_TRACE.map((step) => (
                <AgentTraceStep key={step.name} step={step} />
              ))}
            </div>
          ) : messages.length === 0 ? (
            /* Empty / first-run state */
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: 32,
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>
                  ARWA
                </div>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 15, margin: 0 }}>
                  Your document is ready.
                </p>
                <p style={{ color: 'var(--color-text-tertiary)', fontSize: 13, margin: '4px 0 0' }}>
                  Ask a question to get started.
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 480 }}>
                {SUGGESTED_QUESTIONS.map((q) => (
                  <SuggestedQuestion key={q} text={q} onSelect={handleSend} />
                ))}
              </div>
            </div>
          ) : (
            /* Message list */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 720 }}>
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
            </div>
          )}
        </div>

        {/* Suggested questions strip (only when messages exist) */}
        {!showTrace && messages.length > 0 && (
          <div
            style={{
              padding: '0 24px 8px',
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              flexShrink: 0,
            }}
          >
            {SUGGESTED_QUESTIONS.map((q) => (
              <SuggestedQuestion key={q} text={q} onSelect={handleSend} />
            ))}
          </div>
        )}

        {/* Input bar */}
        <div
          style={{
            padding: '8px 24px 16px',
            backgroundColor: 'var(--color-surface)',
            borderTop: '1px solid var(--color-border)',
            flexShrink: 0,
          }}
        >
          <ChatInput onSend={handleSend} sourceCount={selectedDocIds.size} />
        </div>
      </main>

      {/* ── Right panel: Citations ──────────────────────────────── */}
      <aside
        style={{
          width: 300,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface)',
          overflow: 'hidden',
        }}
      >
        {/* Panel header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '16px 12px 12px',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--color-text-secondary)',
            }}
          >
            Citations
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 20,
              height: 20,
              paddingLeft: 6,
              paddingRight: 6,
              borderRadius: 10,
              backgroundColor: '#E8F5F1',
              color: '#1A8A6B',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {PLACEHOLDER_CITATIONS.length}
          </span>
        </div>

        {/* Citation cards */}
        <div
          style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          {PLACEHOLDER_CITATIONS.map((c) => (
            <CitationCard key={c.index} citation={c} />
          ))}
        </div>
      </aside>
    </div>
  )
}
