import { useState } from 'react'
import { Plus, Search, X } from 'lucide-react'
import dayjs from 'dayjs'
import { useStore } from '../../store/useStore'

function stripHtml(html: string): string {
  const d = document.createElement('div')
  d.innerHTML = html
  return d.textContent ?? ''
}

export default function CompactCardList() {
  const {
    compactNotes, compactSearchQuery, folders,
    setCompactSearchQuery, openCompactEditor, createCompactNote
  } = useStore()

  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    <div className="compact-cardlist">
      {/* Search */}
      <div className="compact-search">
        <Search size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
        <input
          className="compact-search__input selectable"
          placeholder="搜索便签…"
          value={compactSearchQuery}
          onChange={(e) => setCompactSearchQuery(e.target.value)}
        />
        {compactSearchQuery && (
          <button
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', padding: 0 }}
            onClick={() => setCompactSearchQuery('')}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Cards */}
      <div className="compact-cards-scroll">
        {compactNotes.length === 0 ? (
          <div className="compact-empty">
            <Plus size={28} strokeWidth={1.5} />
            <span>暂无便签</span>
          </div>
        ) : (
          compactNotes.map((note) => {
            const preview = stripHtml(note.content).trim().replace(/\s+/g, ' ').slice(0, 80)
            const folder = folders.find((f) => f.id === note.folderId)
            const dateStr = dayjs(note.updatedAt).format('M/D')

            return (
              <div
                key={note.id}
                className={`compact-card ${hoveredId === note.id ? 'compact-card--hover' : ''}`}
                onClick={() => openCompactEditor(note.id)}
                onMouseEnter={() => setHoveredId(note.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div className="compact-card__header">
                  <span className="compact-card__title">
                    {note.title || <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>无标题</span>}
                  </span>
                  <span className="compact-card__date">{dateStr}</span>
                </div>

                {preview && (
                  <div className="compact-card__preview selectable">{preview}</div>
                )}

                <div className="compact-card__footer">
                  <div className="compact-card__tags">
                    {note.tags.slice(0, 3).map((t) => (
                      <span key={t} className="tag-chip" style={{ fontSize: 9, padding: '1px 5px' }}>
                        #{t}
                      </span>
                    ))}
                  </div>
                  {folder && (
                    <span className="compact-card__folder">
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: folder.color, display: 'inline-block' }} />
                      {folder.name}
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* New note FAB */}
      <div className="compact-fab-area">
        <button className="compact-fab" onClick={createCompactNote} title="新建便签">
          <Plus size={18} />
          新建便签
        </button>
      </div>
    </div>
  )
}
