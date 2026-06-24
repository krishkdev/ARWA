'use client'

import PdfIcon from './PdfIcon'
import StatusChip from './StatusChip'

export interface DocumentMeta {
  document_id: string
  filename: string
  page_count: number
  chunk_count?: number
  uploaded_at: string
  status: 'indexed' | 'processing' | 'failed'
}

interface DocumentRowProps {
  document: DocumentMeta
  active?: boolean
  selected?: boolean
  onSelect?: (id: string) => void
  onClick?: (id: string) => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function DocumentRow({
  document: doc,
  active,
  selected,
  onSelect,
  onClick,
}: DocumentRowProps) {
  return (
    <div
      role="row"
      onClick={() => onClick?.(doc.document_id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        cursor: 'pointer',
        borderLeft: active ? '2px solid #4F6EF7' : '2px solid transparent',
        backgroundColor: active ? '#F0EDE8' : 'transparent',
        transition: 'background-color 0.15s',
        userSelect: 'none',
      }}
    >
      <PdfIcon size={24} />

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span
          style={{
            color: '#1A1814',
            fontSize: 13,
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {doc.filename}
        </span>
        <span style={{ color: '#9E9992', fontSize: 11 }}>
          {doc.page_count}p · {formatDate(doc.uploaded_at)}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        <StatusChip status={doc.status} />
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={selected ?? false}
          onChange={(e) => {
            e.stopPropagation()
            onSelect?.(doc.document_id)
          }}
          onClick={(e) => e.stopPropagation()}
          style={{ width: 14, height: 14, cursor: 'pointer', accentColor: '#4F6EF7' }}
        />
      </div>
    </div>
  )
}
