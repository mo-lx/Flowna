import { useState, useRef, useCallback, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  Plus, Search, ArrowUpDown, SortAsc, SortDesc,
  CalendarDays, Type, Clock, Trash2, RotateCcw, Eraser,
  Pin, PinOff, CheckSquare, Square, Copy, GripVertical,
  Rows3, Rows4
} from 'lucide-react'
import dayjs from 'dayjs'
import { useStore, type SortKey } from '../../store/useStore'

function stripHtml(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || ''
}

interface ContextMenu {
  x: number; y: number; noteId: string
}

export default function NoteList() {
  const {
    displayedNotes, selectedNoteId, selectedNoteIds, sidebarView, isLoading,
    searchQuery, sortKey, sortAsc, listDensity,
    selectNote, toggleSelectNote, selectAllNotes, deselectAllNotes,
    createNote, trashNote, restoreNote, purgeNote, emptyTrash,
    batchTrashNotes, batchRestoreNotes, batchPurgeNotes,
    pinNote, setListDensity,
    setSearchQuery, setSortKey, setSortAsc
  } = useStore()

  const [showSort, setShowSort] = useState(false)
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const [dragNoteId, setDragNoteId] = useState<string | null>(null)
  const sortRef = useRef<HTMLDivElement>(null)

  const isTrash = sidebarView === 'trash'
  const selCount = selectedNoteIds.size
  const allSelected = displayedNotes.length > 0 && displayedNotes.every((n) => selectedNoteIds.has(n.id))

  const viewLabel: Record<string, string> = {
    all: '全部便签', unfiled: '未分类', folder: '文件夹', tag: '标签', trash: '回收站'
  }

  const sortOptions: { key: SortKey; label: string; icon: React.ReactNode }[] = [
    { key: 'updatedAt', label: '修改时间', icon: <Clock size={13} /> },
    { key: 'createdAt', label: '创建时间', icon: <CalendarDays size={13} /> },
    { key: 'title', label: '标题', icon: <Type size={13} /> }
  ]

  const noteForMenu = contextMenu ? displayedNotes.find((n) => n.id === contextMenu.noteId) : null

  const handleContextMenu = useCallback((e: MouseEvent, noteId: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, noteId })
  }, [])

  const closeContextMenu = () => setContextMenu(null)

  const handleCopyTitle = async () => {
    if (noteForMenu) { await navigator.clipboard.writeText(noteForMenu.title) }
    closeContextMenu()
  }

  const handleCopyContent = async () => {
    if (noteForMenu) { await navigator.clipboard.writeText(stripHtml(noteForMenu.content)) }
    closeContextMenu()
  }

  const handleContextDelete = () => {
    if (noteForMenu) {
      if (isTrash) { purgeNote(noteForMenu.id) } else { trashNote(noteForMenu.id) }
    }
    closeContextMenu()
  }

  const handleContextRestore = () => {
    if (noteForMenu) restoreNote(noteForMenu.id)
    closeContextMenu()
  }

  const handleContextPin = () => {
    if (noteForMenu) pinNote(noteForMenu.id, !noteForMenu.pinned)
    closeContextMenu()
  }

  const handleToggleAll = () => {
    if (allSelected) deselectAllNotes(); else selectAllNotes()
  }

  const handleBatchTrash = () => {
    if (isTrash) { if (window.confirm(`永久删除 ${selCount} 条便签？此操作不可撤销。`)) batchPurgeNotes() }
    else { batchTrashNotes() }
  }

  const handleBatchRestore = () => { batchRestoreNotes() }

  const handleDragStart = (e: React.DragEvent, noteId: string) => {
    e.dataTransfer.setData('text/plain', noteId)
    e.dataTransfer.effectAllowed = 'move'
    setDragNoteId(noteId)
  }

  const handleDragEnd = () => setDragNoteId(null)

  const handleCardClick = (noteId: string) => {
    if (selCount > 0) {
      toggleSelectNote(noteId)
    } else {
      selectNote(noteId)
    }
  }

  return (
    <div className="note-list">
      {/* ── Header ── */}
      <div className="note-list__header">
        <div className="note-list__title-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {displayedNotes.length > 0 && (
              <button className="checkbox-btn" onClick={handleToggleAll} title={allSelected ? '取消全选' : '全选'}>
                {allSelected ? <CheckSquare size={15} /> : <Square size={15} />}
              </button>
            )}
            <span className="note-list__title">{viewLabel[sidebarView] ?? '便签'}</span>
          </div>
          <div className="note-list__actions">
            {isTrash ? (
              <button
                className="icon-btn"
                onClick={() => { if (window.confirm('清空回收站？此操作不可撤销。')) emptyTrash() }}
                title="清空回收站"
                disabled={displayedNotes.length === 0}
              >
                <Eraser size={15} />
              </button>
            ) : (
              <button className="icon-btn icon-btn--accent" onClick={() => createNote()} title="新建便签">
                <Plus size={16} />
              </button>
            )}
            <button className="icon-btn" onClick={() => setListDensity(listDensity === 'comfortable' ? 'compact' : 'comfortable')} title={listDensity === 'comfortable' ? '紧凑模式' : '舒适模式'}>
              {listDensity === 'comfortable' ? <Rows4 size={15} /> : <Rows3 size={15} />}
            </button>
            <div className="sort-btn" ref={sortRef}>
              <button className="icon-btn" onClick={() => setShowSort((v) => !v)} title="排序">
                <ArrowUpDown size={15} />
              </button>
              {showSort && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setShowSort(false)} />
                  <div className="sort-menu">
                    {sortOptions.map((o) => (
                      <div
                        key={o.key}
                        className={`sort-menu-item ${sortKey === o.key ? 'sort-menu-item--active' : ''}`}
                        onClick={() => { setSortKey(o.key); setShowSort(false) }}
                      >
                        {o.icon} {o.label}
                      </div>
                    ))}
                    <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                    <div className="sort-menu-item" onClick={() => { setSortAsc(!sortAsc); setShowSort(false) }}>
                      {sortAsc ? <SortAsc size={13} /> : <SortDesc size={13} />}
                      {sortAsc ? '升序' : '降序'}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {!isTrash && (
          <div className="search-bar">
            <Search size={13} />
            <input
              type="text"
              placeholder="搜索便签…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        {isTrash && displayedNotes.length > 0 && (
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', paddingTop: 4 }}>
            30天后自动清除 · {displayedNotes.length} 条
          </div>
        )}
      </div>

      {/* ── Note cards ── */}
      <div className="note-list__scroll">
        {isLoading && (
          <div className="note-list__empty">
            <span style={{ color: 'var(--text-tertiary)' }}>加载中…</span>
          </div>
        )}

        {!isLoading && displayedNotes.length === 0 && (
          <div className="note-list__empty">
            {isTrash
              ? <><Trash2 size={32} style={{ marginBottom: 4 }} /><span>回收站为空</span></>
              : <><Plus size={32} style={{ marginBottom: 4 }} /><span>还没有便签</span><span style={{ fontSize: 12 }}>点击右上角「+」新建</span></>
            }
          </div>
        )}

        {!isLoading && displayedNotes.map((note) => {
          const preview = stripHtml(note.content).trim().slice(0, 100)
          const date = dayjs(note.updatedAt).format('MM/DD HH:mm')
          const isActive = note.id === selectedNoteId
          const isSelected = selectedNoteIds.has(note.id)

          return (
            <div
              key={note.id}
              className={`note-card ${isActive ? 'note-card--active' : ''} ${isSelected ? 'note-card--selected' : ''} ${note.pinned ? 'note-card--pinned' : ''} ${listDensity === 'compact' ? 'note-card--compact' : ''} ${dragNoteId === note.id ? 'note-card--dragging' : ''}`}
              onClick={() => handleCardClick(note.id)}
              onContextMenu={(e) => handleContextMenu(e, note.id)}
              draggable={!isTrash}
              onDragStart={(e) => handleDragStart(e, note.id)}
              onDragEnd={handleDragEnd}
            >
              <div className="note-card__left">
                <div className="note-card__checkbox" onClick={(e) => { e.stopPropagation(); toggleSelectNote(note.id) }}>
                  {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                </div>
                <div className="note-card__drag-handle" title="拖拽到文件夹">
                  <GripVertical size={12} />
                </div>
              </div>
              <div className="note-card__body">
                <div className="note-card__title">
                  {note.pinned && <Pin size={10} className="note-card__pin-icon" />}
                  {note.title || <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>无标题</span>}
                </div>
                {preview && listDensity !== 'compact' && (
                  <div className="note-card__preview selectable">{preview}</div>
                )}
                <div className="note-card__meta">
                  <span className="note-card__date">{date}</span>
                  {note.tags.length > 0 && listDensity !== 'compact' && (
                    <div className="note-card__tags">
                      {note.tags.slice(0, 3).map((t) => (
                        <span key={t} className="tag-chip">#{t}</span>
                      ))}
                      {note.tags.length > 3 && <span className="tag-chip">+{note.tags.length - 3}</span>}
                    </div>
                  )}
                  {isTrash && (
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                      <button className="icon-btn" style={{ width: 22, height: 22 }} onClick={(e) => { e.stopPropagation(); restoreNote(note.id) }} title="恢复">
                        <RotateCcw size={12} />
                      </button>
                      <button className="icon-btn" style={{ width: 22, height: 22, color: 'var(--red)' }} onClick={(e) => { e.stopPropagation(); if (window.confirm('永久删除？')) purgeNote(note.id) }} title="永久删除">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Batch action bar ── */}
      {selCount > 0 && (
        <div className="batch-bar">
          <span className="batch-bar__count">已选 {selCount} 条</span>
          <div className="batch-bar__actions">
            {isTrash ? (
              <>
                <button className="batch-btn batch-btn--restore" onClick={handleBatchRestore}>
                  <RotateCcw size={13} /> 恢复
                </button>
                <button className="batch-btn batch-btn--danger" onClick={handleBatchTrash}>
                  <Trash2 size={13} /> 永久删除
                </button>
              </>
            ) : (
              <button className="batch-btn batch-btn--danger" onClick={handleBatchTrash}>
                <Trash2 size={13} /> 删除
              </button>
            )}
            <button className="batch-btn" onClick={deselectAllNotes}>
              取消
            </button>
          </div>
        </div>
      )}

      {/* ── Context menu (portal) ── */}
      {contextMenu && createPortal(
        <>
          <div className="context-menu-overlay" onClick={closeContextMenu} />
          <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
            <div className="context-menu-item" onClick={handleCopyTitle}>
              <Copy size={12} /> 复制标题
            </div>
            <div className="context-menu-item" onClick={handleCopyContent}>
              <Copy size={12} /> 复制内容
            </div>
            {!isTrash && (
              <div className="context-menu-item" onClick={handleContextPin}>
                {noteForMenu?.pinned ? <PinOff size={12} /> : <Pin size={12} />}
                {noteForMenu?.pinned ? '取消置顶' : '置顶'}
              </div>
            )}
            <div style={{ height: 1, background: 'var(--border)', margin: '3px 0' }} />
            {isTrash ? (
              <>
                <div className="context-menu-item" onClick={handleContextRestore}>
                  <RotateCcw size={12} /> 恢复
                </div>
                <div className="context-menu-item context-menu-item--danger" onClick={handleContextDelete}>
                  <Trash2 size={12} /> 永久删除
                </div>
              </>
            ) : (
              <div className="context-menu-item context-menu-item--danger" onClick={handleContextDelete}>
                <Trash2 size={12} /> 删除
              </div>
            )}
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
