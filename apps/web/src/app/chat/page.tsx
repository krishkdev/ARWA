'use client'

import { Suspense } from 'react'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plus, Activity } from 'lucide-react'

import PdfIcon from '@/components/PdfIcon'
import DocumentRow from '@/components/DocumentRow'
import CitationCard from '@/components/CitationCard'
import ChatMessage from '@/components/ChatMessage'
import ChatInput from '@/components/ChatInput'
import SuggestedQuestion from '@/components/SuggestedQuestion'
import AgentTraceStep from '@/components/AgentTraceStep'

import { listDocuments, sendChat } from '@/lib/api'
import type { DocumentMeta as ApiDocMeta } from '@/lib/api'
import type { DocumentMeta as RowDocMeta } from '@/components/DocumentRow'
import type { Message } from '@/components/ChatMessage'
import type { Citation } from '@/components/CitationCard'
import type { TraceStep } from '@/components/AgentTraceStep'

// API DocumentMeta → DocumentRow DocumentMeta (same shape now, just re-typed)
function toRowDoc(d: ApiDocMeta): RowDocMeta {
  return {
    document_id: d.document_id,
    filename: d.filename,
    page_count: d.page_count,
    chunk_count: d.chunk_count,
    uploaded_at: d.uploaded_at,
    status: d.status,
  }
}

const SUGGESTED_QUESTIONS = [
  'Summarize this document',
  'What are the key findings?',
  'What methodology was used?',
]

// ── Placeholder trace (shown until Session 3 wires the real agent) ──────────
const STUB_TRACE: TraceStep[] = [
  { name: 'PLAN',     status: 'complete', description: 'Decomposing query into sub-questions',                          duration_ms: 21 },
  { name: 'RETRIEVE', status: 'complete', description: 'Fetching top-5 chunks across selected documents',               duration_ms: 138 },
  { name: 'REASON',   status: 'complete', description: 'Synthesising answer from retrieved context',                    duration_ms: 84 },
  { name: 'TOOL',     status: 'pending',  description: 'No tool calls required',                                        duration_ms: null },
  { name: 'VERIFY',   status: 'complete', description: 'Hallucination risk: LOW',                                       duration_ms: 31 },
]

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatPageInner />
    </Suspense>
  )
}

function ChatPageInner() {
  const searchParams = useSearchParams()
  const initialDocId = searchParams.get('doc')

  const [docs, setDocs] = useState<ApiDocMeta[]>([])
  const [docsError, setDocsError] = useState<string | null>(null)
  const [activeDocId, setActiveDocId] = useState<string | null>(initialDocId)
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(
    initialDocId ? new Set([initialDocId]) : new Set()
  )
  const [showTrace, setShowTrace] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  // Load document list on mount
  useEffect(() => {
    listDocuments()
      .then((list) => {
        setDocs(list)
        // If we have an initialDocId from URL that's not yet in the list,
        // it may still be processing — keep the selection as-is.
        if (initialDocId && list.some((d) => d.document_id === initialDocId)) {
          setActiveDocId(initialDocId)
          setSelectedDocIds(new Set([initialDocId]))
        } else if (!initialDocId && list.length > 0) {
          setActiveDocId(list[0].document_id)
          setSelectedDocIds(new Set([list[0].document_id]))
        }
      })
      .catch((err) => setDocsError(err instanceof Error ? err.message : 'Failed to load documents'))
  }, [initialDocId])

  function toggleSelected(id: string) {
    setSelectedDocIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSend = useCallback(
    async (text: string) => {
      if (sending) return
      setSending(true)
      setSendError(null)

      // Optimistic: show the question immediately (future: add user message bubble)
      try {
        const res = await sendChat(text, Array.from(selectedDocIds))

        const citations: Citation[] = res.citations.map((c) => ({
          index: c.index,
          document_id: c.document_id,
          filename: c.filename,
          page: c.page,
          excerpt: c.excerpt,
          relevance_score: c.relevance_score,
        }))

        const msg: Message = {
          id: `msg-${Date.now()}`,
          answer: res.answer,
          citations,
          confidence: res.confidence,
          hallucination_risk: res.hallucination_risk,
          role: 'assistant',
        }
        setMessages((prev) => [...prev, msg])
      } catch (err) {
        setSendError(err instanceof Error ? err.message : 'Failed to send message.')
      } finally {
        setSending(false)
      }
    },
    [sending, selectedDocIds]
  )

  const activeDoc = docs.find((d) => d.document_id === activeDocId)

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

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {docsError ? (
            <p style={{ padding: '12px', fontSize: 13, color: '#C0392B' }}>{docsError}</p>
          ) : docs.length === 0 ? (
            <p style={{ padding: '12px', fontSize: 13, color: 'var(--color-text-tertiary)' }}>
              No documents yet. Upload one on the home page.
            </p>
          ) : (
            docs.map((doc) => (
              <DocumentRow
                key={doc.document_id}
                document={toRowDoc(doc)}
                active={doc.document_id === activeDocId}
                selected={selectedDocIds.has(doc.document_id)}
                onClick={setActiveDocId}
                onSelect={toggleSelected}
              />
            ))
          )}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {activeDoc && <PdfIcon size={16} />}
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
              {activeDoc?.filename ?? 'No document selected'}
            </span>
          </div>

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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 640 }}>
              {STUB_TRACE.map((step) => (
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
                  {activeDoc ? 'Your document is ready.' : 'Select a document to get started.'}
                </p>
                {activeDoc && (
                  <p style={{ color: 'var(--color-text-tertiary)', fontSize: 13, margin: '4px 0 0' }}>
                    Ask a question to get started.
                  </p>
                )}
              </div>
              {activeDoc && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 480 }}>
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <SuggestedQuestion key={q} text={q} onSelect={handleSend} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 720 }}>
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {sending && (
                <p style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>Thinking…</p>
              )}
              {sendError && (
                <p style={{ color: '#C0392B', fontSize: 13 }}>{sendError}</p>
              )}
            </div>
          )}
        </div>

        {/* Suggested questions strip (only when messages exist and not in trace view) */}
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
          <ChatInput
            onSend={handleSend}
            sourceCount={selectedDocIds.size}
            disabled={sending || selectedDocIds.size === 0}
          />
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
          {messages.length > 0 && (
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
              {messages[messages.length - 1].citations.length}
            </span>
          )}
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {messages.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', padding: '4px 0' }}>
              Citations will appear here after your first question.
            </p>
          ) : (
            messages[messages.length - 1].citations.map((c) => (
              <CitationCard key={c.index} citation={c} />
            ))
          )}
        </div>
      </aside>
    </div>
  )
}
