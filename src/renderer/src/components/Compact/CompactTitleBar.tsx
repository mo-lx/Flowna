import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Pin, PinOff, Maximize2, X, ChevronDown,
  Hash, Folder, SortAsc, SortDesc, Clock, Type,
  Minus
} from 'lucide-react'
import { useStore, type CompactAlpha, type SortKey } from '../../store/useStore'

const ALPHA_STEPS: CompactAlpha[] = [1.0, 0.85, 0.70, 0.55]

interface DropPos { top: number; left: number }

export default function CompactTitleBar() {
  const {
    folders, tags, compactPinned, compactAlpha,
    compactFolderFilter, compactTagFilter, compactSortKey, compactSortAsc,
    setCompactPinned, setCompactAlpha, setCompactFolderFilter,
    setCompactTagFilter, setCompactSortKey, setCompactSortAsc, exitCompact
  } = useStore()

  const [showFolder, setShowFolder] = useState(false)
  const [showTag, setShowTag] = useState(false)
  const [showSort, setShowSort] = useState(false)
  const [folderPos, setFolderPos] = useState<DropPos>({ top: 0, left: 0 })
  const [tagPos, setTagPos] = useState<DropPos>({ top: 0, left: 0 })
  const [sortPos, setSortPos] = useState<DropPos>({ top: 0, left: 0 })

  const folderRef = useRef<HTMLButtonElement>(null)
  const tagRef = useRef<HTMLButtonElement>(null)
  const sortRef = useRef<HTMLButtonElement>(null)

  const openFolder = () => {
    const r = folderRef.current?.getBoundingClientRect()
    if (r) setFolderPos({ top: r.bottom + 5, left: r.left })
    setShowFolder((v) => !v); setShowTag(false); setShowSort(false)
  }
  const openTag = () => {
    const r = tagRef.current?.getBoundingClientRect()
    if (r) setTagPos({ top: r.bottom + 5, left: r.left })
    setShowTag((v) => !v); setShowFolder(false); setShowSort(false)
  }
  const openSort = () => {
    const r = sortRef.current?.getBoundingClientRect()
    if (r) setSortPos({ top: r.bottom + 5, left: Math.max(r.right - 140, 4) })
    setShowSort((v) => !v); setShowFolder(false); setShowTag(false)
  }

  const cycleAlpha = () => {
    const idx = ALPHA_STEPS.indexOf(compactAlpha)
    setCompactAlpha(ALPHA_STEPS[(idx + 1) % ALPHA_STEPS.length])
  }

  const alphaPercent = Math.round(compactAlpha * 100)

  const activeFolderName =
    !compactFolderFilter || compactFolderFilter === '__all__' ? '全部'
    : compactFolderFilter === '__unfiled__' ? '未分类'
    : folders.find((f) => f.id === compactFolderFilter)?.name ?? '全部'

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'updatedAt', label: '修改时间' },
    { key: 'createdAt', label: '创建时间' },
    { key: 'title', label: '标题' }
  ]

  return (
    /* The titlebar itself is the drag region.
       Only individual buttons carry -webkit-app-region:no-drag.
       Container divs deliberately have NO -webkit-app-region so that
       empty gaps between buttons remain draggable (inherit from parent). */
    <div className="compact-titlebar">

      {/* Brand — pointer-events:none so it participates in drag area */}
      <div className="compact-titlebar__brand">
        <span className="compact-titlebar__dot" />
        Flowna
      </div>

      {/* Filters — container inherits drag; only buttons are no-drag */}
      <div className="compact-titlebar__filters">
        <button
          ref={folderRef}
          className={`compact-filter-btn ${compactFolderFilter && compactFolderFilter !== '__all__' ? 'compact-filter-btn--active' : ''}`}
          onClick={openFolder}
        >
          <Folder size={11} />
          <span>{activeFolderName}</span>
          <ChevronDown size={9} />
        </button>

        {tags.length > 0 && (
          <button
            ref={tagRef}
            className={`compact-filter-btn ${compactTagFilter ? 'compact-filter-btn--active' : ''}`}
            onClick={openTag}
          >
            <Hash size={11} />
            <span>{compactTagFilter ?? '标签'}</span>
            <ChevronDown size={9} />
          </button>
        )}

        <button ref={sortRef} className="compact-filter-btn" onClick={openSort} title="排序">
          {compactSortAsc ? <SortAsc size={11} /> : <SortDesc size={11} />}
        </button>
      </div>

      {/* Controls — container inherits drag; only buttons are no-drag */}
      <div className="compact-titlebar__controls">
        <button
          className="compact-ctrl-btn"
          onClick={cycleAlpha}
          title={`透明度 ${alphaPercent}%`}
        >
          {/* Half-filled circle shows current opacity level */}
          <svg width="13" height="13" viewBox="0 0 13 13" style={{ display: 'block' }}>
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.1" fill="none" />
            <path
              d="M6.5 1.5a5 5 0 0 1 0 10V1.5z"
              fill="currentColor"
              opacity={compactAlpha < 1 ? 0.9 : 0.5}
              style={{ transform: compactAlpha < 1 ? `scaleX(${compactAlpha})` : undefined, transformOrigin: 'right center' }}
            />
            <text x="6.5" y="9" textAnchor="middle" fontSize="4.5" fill="currentColor" fontFamily="sans-serif">
              {alphaPercent < 100 ? alphaPercent : '●'}
            </text>
          </svg>
        </button>

        <button
          className={`compact-ctrl-btn ${compactPinned ? 'compact-ctrl-btn--active' : ''}`}
          onClick={() => setCompactPinned(!compactPinned)}
          title={compactPinned ? '取消置顶' : '置顶'}
        >
          {compactPinned ? <Pin size={12} /> : <PinOff size={12} />}
        </button>

        <button className="compact-ctrl-btn" onClick={() => window.api.windowMinimize()} title="最小化">
          <Minus size={12} />
        </button>

        <button className="compact-ctrl-btn" onClick={exitCompact} title="展开主界面">
          <Maximize2 size={12} />
        </button>

        <button
          className="compact-ctrl-btn compact-ctrl-btn--close"
          onClick={() => window.api.windowClose()}
          title="关闭"
        >
          <X size={12} />
        </button>
      </div>

      {/* ── Portaled dropdowns ── */}
      {showFolder && createPortal(
        <>
          <div className="compact-portal-overlay" onClick={() => setShowFolder(false)} />
          <div className="compact-dropdown" style={{ top: folderPos.top, left: folderPos.left }}>
            {[
              { id: '__all__', label: '全部', color: 'var(--text-tertiary)' },
              { id: '__unfiled__', label: '未分类', color: 'var(--text-tertiary)' },
              ...folders.map((f) => ({ id: f.id, label: f.name, color: f.color }))
            ].map((item) => (
              <div
                key={item.id}
                className={`compact-dropdown-item ${compactFolderFilter === item.id ? 'compact-dropdown-item--active' : ''}`}
                onClick={() => { setCompactFolderFilter(item.id); setShowFolder(false) }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0, display: 'inline-block' }} />
                {item.label}
              </div>
            ))}
          </div>
        </>,
        document.body
      )}

      {showTag && createPortal(
        <>
          <div className="compact-portal-overlay" onClick={() => setShowTag(false)} />
          <div className="compact-dropdown" style={{ top: tagPos.top, left: tagPos.left }}>
            <div
              className={`compact-dropdown-item ${!compactTagFilter ? 'compact-dropdown-item--active' : ''}`}
              onClick={() => { setCompactTagFilter(null); setShowTag(false) }}
            >
              <Hash size={10} /> 全部标签
            </div>
            {tags.map((t) => (
              <div
                key={t.id}
                className={`compact-dropdown-item ${compactTagFilter === t.name ? 'compact-dropdown-item--active' : ''}`}
                onClick={() => { setCompactTagFilter(t.name); setShowTag(false) }}
              >
                <Hash size={10} /> {t.name}
                <span className="compact-dropdown-item__count">{t.noteCount ?? 0}</span>
              </div>
            ))}
          </div>
        </>,
        document.body
      )}

      {showSort && createPortal(
        <>
          <div className="compact-portal-overlay" onClick={() => setShowSort(false)} />
          <div className="compact-dropdown" style={{ top: sortPos.top, left: sortPos.left }}>
            {sortOptions.map((o) => (
              <div
                key={o.key}
                className={`compact-dropdown-item ${compactSortKey === o.key ? 'compact-dropdown-item--active' : ''}`}
                onClick={() => { setCompactSortKey(o.key); setShowSort(false) }}
              >
                {o.key === 'title' ? <Type size={10} /> : <Clock size={10} />}
                {o.label}
              </div>
            ))}
            <div style={{ height: 1, background: 'var(--border)', margin: '3px 0' }} />
            <div
              className="compact-dropdown-item"
              onClick={() => { setCompactSortAsc(!compactSortAsc); setShowSort(false) }}
            >
              {compactSortAsc ? <SortAsc size={10} /> : <SortDesc size={10} />}
              {compactSortAsc ? '升序' : '降序'}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
