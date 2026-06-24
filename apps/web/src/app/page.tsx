'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import PdfIcon from '@/components/PdfIcon'

type UploadState = 'idle' | 'dragging' | 'selected' | 'uploading'

export default function LandingPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const MAX_MB = 50

  function validateFile(file: File): string | null {
    if (!file.name.toLowerCase().endsWith('.pdf')) return 'Only PDF files are accepted.'
    if (file.size > MAX_MB * 1024 * 1024) return `File exceeds ${MAX_MB} MB limit.`
    return null
  }

  function acceptFile(file: File) {
    const err = validateFile(file)
    if (err) {
      setError(err)
      setUploadState('idle')
      return
    }
    setError(null)
    setSelectedFile(file)
    setUploadState('selected')
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setUploadState('dragging')
  }, [])

  const handleDragLeave = useCallback(() => {
    setUploadState((s) => (s === 'dragging' ? 'idle' : s))
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) acceptFile(file)
    else setUploadState('idle')
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) acceptFile(file)
  }

  function handleUpload() {
    if (!selectedFile) return
    setUploadState('uploading')
    // No API yet — simulate a brief delay then redirect with a stub id
    setTimeout(() => {
      router.push('/chat?doc=stub-id')
    }, 1200)
  }

  const isDragging = uploadState === 'dragging'

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F7F5F0',
        padding: 32,
        position: 'relative',
      }}
    >
      {/* Wordmark */}
      <div
        style={{
          position: 'absolute',
          top: 24,
          left: 32,
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: '-0.01em',
          color: '#1A1814',
        }}
      >
        ARWA
      </div>

      {/* Hero text */}
      <div style={{ textAlign: 'center', marginBottom: 40, maxWidth: 560 }}>
        <h1
          style={{
            fontSize: 48,
            fontWeight: 600,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            color: '#1A1814',
            margin: '0 0 16px',
          }}
        >
          Ask your documents anything.
        </h1>
        <p
          style={{
            fontSize: 18,
            color: '#6B6560',
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          Upload a PDF. Get grounded, cited answers.
        </p>
      </div>

      {/* Upload zone */}
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload PDF — click or drag and drop"
          onClick={() => uploadState === 'idle' && inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && uploadState === 'idle' && inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: 48,
            border: `2px dashed ${isDragging ? '#4F6EF7' : '#C8C3BB'}`,
            borderRadius: 16,
            backgroundColor: isDragging ? '#EEF1FE' : '#FFFFFF',
            cursor: uploadState === 'idle' ? 'pointer' : 'default',
            transition: 'border-color 0.15s, background-color 0.15s',
            outline: 'none',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#4F6EF7')}
          onBlur={(e) => (e.currentTarget.style.borderColor = isDragging ? '#4F6EF7' : '#C8C3BB')}
        >
          <PdfIcon size={48} />

          {uploadState === 'selected' && selectedFile ? (
            <>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: '#1A1814', textAlign: 'center' }}>
                {selectedFile.name}
              </p>
              <p style={{ margin: 0, fontSize: 13, color: '#9E9992' }}>
                {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
              </p>
              <button
                type="button"
                onClick={handleUpload}
                style={{
                  marginTop: 8,
                  padding: '10px 24px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: '#4F6EF7',
                  color: '#FFFFFF',
                  fontSize: 15,
                  fontWeight: 500,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                Upload &amp; analyze
              </button>
              <button
                type="button"
                onClick={() => { setSelectedFile(null); setUploadState('idle') }}
                style={{
                  padding: 0,
                  border: 'none',
                  background: 'none',
                  color: '#9E9992',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Remove
              </button>
            </>
          ) : uploadState === 'uploading' ? (
            <>
              <p style={{ margin: 0, fontSize: 15, color: '#1A1814' }}>Uploading…</p>
              <div
                style={{
                  width: '100%',
                  maxWidth: 200,
                  height: 2,
                  backgroundColor: '#E2DDD6',
                  borderRadius: 1,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: '60%',
                    height: '100%',
                    backgroundColor: '#4F6EF7',
                    borderRadius: 1,
                    animation: 'progress-pulse 1s ease-in-out infinite alternate',
                  }}
                />
              </div>
            </>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: '#1A1814', textAlign: 'center' }}>
                {isDragging ? 'Drop to upload' : 'Drop a PDF or click to browse'}
              </p>
              <p style={{ margin: 0, fontSize: 13, color: '#9E9992' }}>
                PDF files · up to {MAX_MB} MB
              </p>
            </>
          )}
        </div>

        {/* Inline error */}
        {error && (
          <p style={{ marginTop: 8, fontSize: 13, color: '#C0392B', textAlign: 'center' }}>{error}</p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Footer */}
      <p
        style={{
          position: 'absolute',
          bottom: 24,
          fontSize: 12,
          color: '#9E9992',
          margin: 0,
        }}
      >
        Powered by Claude
      </p>

      <style>{`
        @keyframes progress-pulse {
          from { width: 30% }
          to   { width: 80% }
        }
      `}</style>
    </div>
  )
}
