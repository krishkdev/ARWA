'use client'

interface CitationChipProps {
  index: number
  onClick?: () => void
}

export default function CitationChip({ index, onClick }: CitationChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 20,
        minWidth: 20,
        paddingLeft: 6,
        paddingRight: 6,
        borderRadius: 10,
        backgroundColor: '#E8F5F1',
        color: '#1A8A6B',
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1,
        border: 'none',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      [{index}]
    </button>
  )
}
