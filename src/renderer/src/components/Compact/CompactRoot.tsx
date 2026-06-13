import { useMemo } from 'react'
import { useStore } from '../../store/useStore'
import CompactTitleBar from './CompactTitleBar'
import CompactCardList from './CompactCardList'
import CompactEditor from './CompactEditor'

export default function CompactRoot() {
  const { compactAlpha, compactEditNoteId, theme } = useStore()

  // Compute glassmorphism background inline — more reliable than CSS variables
  const bgStyle = useMemo(() => {
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

    const [r, g, b] = isDark ? [28, 28, 30] : [242, 242, 247]
    const borderColor = isDark
      ? `rgba(255,255,255,${0.08 + compactAlpha * 0.06})`
      : `rgba(255,255,255,${0.4 + compactAlpha * 0.3})`

    return {
      background: `rgba(${r}, ${g}, ${b}, ${compactAlpha})`,
      borderColor,
      // Pass through for any remaining CSS that uses the variable
      '--compact-alpha': compactAlpha
    } as React.CSSProperties
  }, [compactAlpha, theme])

  return (
    <div className="compact-root" style={bgStyle}>
      <CompactTitleBar />
      <div className="compact-body">
        {compactEditNoteId ? <CompactEditor /> : <CompactCardList />}
      </div>
    </div>
  )
}
