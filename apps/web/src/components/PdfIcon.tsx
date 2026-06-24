'use client'

interface PdfIconProps {
  size?: 16 | 24 | 36 | 48
}

export default function PdfIcon({ size = 24 }: PdfIconProps) {
  // Badge and fold scale proportionally with icon size
  const foldSize = Math.round(size * 0.25)
  const badgeHeight = Math.round(size * 0.22)
  const badgeFontSize = Math.round(size * 0.175)
  const badgePaddingX = Math.round(size * 0.1)

  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-flex',
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      {/* Document body */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', inset: 0 }}
      >
        {/* White body with clipped top-right corner */}
        <path
          d={`M4 4 H${48 - 12} L${48} ${12} V44 Q48 44 47 44 H5 Q4 44 4 43 V5 Q4 4 4 4 Z`}
          fill="#FFFFFF"
          stroke="#E2DDD6"
          strokeWidth="1.5"
        />
        {/* Dog-ear fold triangle */}
        <path
          d={`M${48 - 12} 4 L${48} ${12} H${48 - 12} Z`}
          fill="#F0EDE8"
          stroke="#E2DDD6"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>

      {/* PDF badge — centered vertically in lower 60% of icon */}
      <span
        style={{
          position: 'absolute',
          bottom: '22%',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: badgeHeight,
          paddingLeft: badgePaddingX,
          paddingRight: badgePaddingX,
          borderRadius: badgeHeight / 2,
          backgroundColor: '#E03B2F',
          color: '#FFFFFF',
          fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
          fontSize: badgeFontSize,
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
          userSelect: 'none',
        }}
      >
        PDF
      </span>
    </span>
  )
}
