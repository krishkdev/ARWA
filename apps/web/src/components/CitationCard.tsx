'use client'

export interface Citation {
  index: number
  document_id: string
  filename: string
  page: number
  excerpt: string
  relevance_score: number
}

interface CitationCardProps {
  citation: Citation
}

export default function CitationCard({ citation }: CitationCardProps) {
  return (
    <div
      style={{
        borderLeft: '2px solid #1A8A6B',
        paddingLeft: 12,
        paddingTop: 10,
        paddingBottom: 10,
        paddingRight: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        border: '1px solid #E2DDD6',
        borderLeftColor: '#1A8A6B',
        borderLeftWidth: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            color: '#1A8A6B',
            fontWeight: 600,
            fontSize: 13,
            minWidth: 20,
            flexShrink: 0,
          }}
        >
          [{citation.index}]
        </span>
        <span
          style={{
            color: '#1A1814',
            fontSize: 13,
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}
        >
          {citation.filename}
        </span>
        <span style={{ color: '#9E9992', fontSize: 11, flexShrink: 0 }}>
          p.{citation.page}
        </span>
      </div>

      <p
        style={{
          color: '#6B6560',
          fontSize: 12,
          lineHeight: 1.5,
          margin: 0,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {citation.excerpt}
      </p>

      {/* Relevance score bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            flex: 1,
            height: 2,
            backgroundColor: '#E8F5F1',
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${Math.round(citation.relevance_score * 100)}%`,
              height: '100%',
              backgroundColor: '#1A8A6B',
              borderRadius: 1,
            }}
          />
        </div>
        <span style={{ color: '#9E9992', fontSize: 11, flexShrink: 0 }}>
          {Math.round(citation.relevance_score * 100)}%
        </span>
      </div>
    </div>
  )
}
