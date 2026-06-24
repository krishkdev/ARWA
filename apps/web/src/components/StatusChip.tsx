'use client'

type Status = 'indexed' | 'processing' | 'failed'

interface StatusChipProps {
  status: Status
}

const CONFIG: Record<Status, { label: string; bg: string; color: string }> = {
  indexed:    { label: 'Indexed',    bg: '#E8F5F1', color: '#1A8A6B' },
  processing: { label: 'Processing', bg: '#FEF3E2', color: '#C47A1A' },
  failed:     { label: 'Failed',     bg: '#FDE8E7', color: '#C0392B' },
}

export default function StatusChip({ status }: StatusChipProps) {
  const { label, bg, color } = CONFIG[status]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 18,
        paddingLeft: 6,
        paddingRight: 6,
        borderRadius: 4,
        backgroundColor: bg,
        color,
        fontSize: 11,
        fontWeight: 500,
        lineHeight: 1,
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  )
}
