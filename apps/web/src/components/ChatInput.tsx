'use client'

import { useState, useRef } from 'react'
import { Send } from 'lucide-react'

interface ChatInputProps {
  onSend: (text: string) => void
  sourceCount?: number
  disabled?: boolean
}

export default function ChatInput({ onSend, sourceCount = 0, disabled }: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleSubmit() {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value)
    // Auto-grow
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 8,
        padding: '10px 12px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2DDD6',
        borderRadius: 12,
        transition: 'border-color 0.15s',
      }}
      onFocusCapture={(e) => (e.currentTarget.style.borderColor = '#C8C3BB')}
      onBlurCapture={(e) => (e.currentTarget.style.borderColor = '#E2DDD6')}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Ask a question..."
        rows={1}
        style={{
          flex: 1,
          border: 'none',
          outline: 'none',
          resize: 'none',
          fontFamily: 'inherit',
          fontSize: 15,
          lineHeight: 1.5,
          color: '#1A1814',
          backgroundColor: 'transparent',
          maxHeight: 160,
          overflowY: 'auto',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {sourceCount > 0 && (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: 10,
              backgroundColor: '#EEF1FE',
              color: '#4F6EF7',
              fontSize: 12,
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            {sourceCount} {sourceCount === 1 ? 'source' : 'sources'}
          </span>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!value.trim() || disabled}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 8,
            border: 'none',
            backgroundColor: value.trim() && !disabled ? '#4F6EF7' : '#E2DDD6',
            color: value.trim() && !disabled ? '#FFFFFF' : '#9E9992',
            cursor: value.trim() && !disabled ? 'pointer' : 'not-allowed',
            transition: 'background-color 0.15s',
            flexShrink: 0,
          }}
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  )
}
