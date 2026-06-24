'use client'

interface SuggestedQuestionProps {
  text: string
  onSelect: (text: string) => void
}

export default function SuggestedQuestion({ text, onSelect }: SuggestedQuestionProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(text)}
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        padding: '10px 16px',
        border: '1px solid #E2DDD6',
        borderRadius: 20,
        backgroundColor: 'transparent',
        color: '#1A1814',
        fontSize: 14,
        fontFamily: 'inherit',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'border-color 0.15s, background-color 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#C8C3BB'
        e.currentTarget.style.backgroundColor = '#F0EDE8'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#E2DDD6'
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      {text}
    </button>
  )
}
