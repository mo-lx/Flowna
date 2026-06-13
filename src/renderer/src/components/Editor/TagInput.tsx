import { useState, useRef, KeyboardEvent } from 'react'
import { Hash, X } from 'lucide-react'

interface Props {
  tags: string[]
  onChange: (tags: string[]) => void
  allTags?: string[]
}

export default function TagInput({ tags, onChange, allTags = [] }: Props) {
  const [input, setInput] = useState('')
  const [showSuggest, setShowSuggest] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const suggestions = allTags.filter(
    (t) => t.toLowerCase().includes(input.toLowerCase().replace(/^#/, '')) &&
    !tags.includes(t) && input.length > 0
  ).slice(0, 5)

  const addTag = (raw: string) => {
    const name = raw.startsWith('#') ? raw.slice(1) : raw
    const cleaned = name.trim().replace(/\s+/g, '-')
    if (!cleaned || tags.includes(cleaned)) return
    onChange([...tags, cleaned])
    setInput('')
    setShowSuggest(false)
  }

  const removeTag = (t: string) => onChange(tags.filter((x) => x !== t))

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',' || e.key === ' ' || e.key === 'Tab') && input.trim()) {
      e.preventDefault()
      addTag(input.trim())
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1))
    } else if (e.key === 'Escape') {
      setShowSuggest(false)
    }
  }

  return (
    <div className="tag-input-area" style={{ position: 'relative' }}>
      <Hash size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
      <div className="tag-input">
        {tags.map((t) => (
          <span key={t} className="tag-chip tag-chip--removable">
            #{t}
            <span className="tag-chip__remove" onClick={() => removeTag(t)}>
              <X size={9} />
            </span>
          </span>
        ))}
        <input
          ref={inputRef}
          className="tag-input__field selectable"
          placeholder={tags.length === 0 ? '添加标签… (回车确认)' : ''}
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowSuggest(true) }}
          onKeyDown={handleKey}
          onFocus={() => setShowSuggest(true)}
          onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
        />
      </div>

      {showSuggest && suggestions.length > 0 && (
        <div
          className="folder-select-menu"
          style={{ top: 'calc(100% + 4px)', left: 20, minWidth: 140 }}
        >
          {suggestions.map((s) => (
            <div
              key={s}
              className="folder-select-item"
              onMouseDown={(e) => { e.preventDefault(); addTag(s) }}
            >
              <Hash size={11} />
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
