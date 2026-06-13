import { useState } from 'react'
import {
  FileText, Folder, Hash, Trash2, Plus, Pencil, Trash,
  ChevronDown, ChevronRight, FileQuestion
} from 'lucide-react'
import { useStore } from '../../store/useStore'

export default function Sidebar() {
  const {
    folders, tags, notes, sidebarView, selectedFolderId, selectedTag,
    selectAll, selectFolder, selectTag, selectTrash, selectUnfiled,
    openFolderModal, deleteFolder, updateNote
  } = useStore()

  const [foldersOpen, setFoldersOpen] = useState(true)
  const [tagsOpen, setTagsOpen] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null)

  const allCount = notes.filter((n) => !n.isDeleted).length

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverTarget(targetId)
  }

  const handleDragLeave = () => setDragOverTarget(null)

  const handleDrop = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault()
    setDragOverTarget(null)
    const noteId = e.dataTransfer.getData('text/plain')
    if (noteId) updateNote(noteId, { folderId })
  }

  return (
    <div className="sidebar">
      <div className="sidebar__scroll">
        {/* All notes */}
        <div className="sidebar__section">
          <div
            className={`sidebar-item ${sidebarView === 'all' ? 'sidebar-item--active' : ''}`}
            onClick={selectAll}
          >
            <span className="sidebar-item__icon"><FileText size={15} /></span>
            <span className="sidebar-item__label">全部便签</span>
          </div>
          <div
            className={`sidebar-item ${sidebarView === 'unfiled' ? 'sidebar-item--active' : ''} ${dragOverTarget === '__unfiled__' ? 'sidebar-item--drag-over' : ''}`}
            onClick={selectUnfiled}
            onDragOver={(e) => handleDragOver(e, '__unfiled__')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, null)}
          >
            <span className="sidebar-item__icon"><FileQuestion size={15} /></span>
            <span className="sidebar-item__label">未分类</span>
          </div>
        </div>

        {/* Folders */}
        <div className="sidebar__section">
          <div className="sidebar__section-header">
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
              onClick={() => setFoldersOpen((v) => !v)}
            >
              {foldersOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
              文件夹
            </div>
            <button
              className="sidebar__add-btn"
              onClick={() => openFolderModal()}
              title="新建文件夹"
            >
              <Plus size={12} />
            </button>
          </div>

          {foldersOpen && folders.map((f) => (
            <div
              key={f.id}
              className={`sidebar-item ${sidebarView === 'folder' && selectedFolderId === f.id ? 'sidebar-item--active' : ''} ${dragOverTarget === f.id ? 'sidebar-item--drag-over' : ''}`}
              onClick={() => selectFolder(f.id)}
              onDragOver={(e) => handleDragOver(e, f.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, f.id)}
            >
              <span className="sidebar-item__icon">
                <span className="folder-dot" style={{ background: f.color }} />
              </span>
              <span className="sidebar-item__label">{f.name}</span>
              <div className="sidebar-item__actions">
                <button
                  className="sidebar-item__action-btn"
                  onClick={(e) => { e.stopPropagation(); openFolderModal(f) }}
                  title="编辑"
                >
                  <Pencil size={12} />
                </button>
                <button
                  className="sidebar-item__action-btn"
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(f.id) }}
                  title="删除"
                >
                  <Trash size={12} />
                </button>
              </div>
            </div>
          ))}

          {foldersOpen && folders.length === 0 && (
            <div style={{ padding: '6px 12px', fontSize: 12, color: 'var(--text-tertiary)' }}>
              暂无文件夹
            </div>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="sidebar__section">
            <div className="sidebar__section-header">
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                onClick={() => setTagsOpen((v) => !v)}
              >
                {tagsOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                标签
              </div>
            </div>
            {tagsOpen && tags.map((t) => (
              <div
                key={t.id}
                className={`sidebar-item ${sidebarView === 'tag' && selectedTag === t.name ? 'sidebar-item--active' : ''}`}
                onClick={() => selectTag(t.name)}
              >
                <span className="sidebar-item__icon"><Hash size={13} /></span>
                <span className="sidebar-item__label">{t.name}</span>
                <span className="sidebar-item__count">{t.noteCount ?? 0}</span>
              </div>
            ))}
          </div>
        )}

        {/* Trash */}
        <div className="sidebar__section" style={{ marginTop: 'auto', paddingTop: 8 }}>
          <div
            className={`sidebar-item ${sidebarView === 'trash' ? 'sidebar-item--active' : ''}`}
            onClick={selectTrash}
          >
            <span className="sidebar-item__icon"><Trash2 size={15} /></span>
            <span className="sidebar-item__label">回收站</span>
          </div>
        </div>
      </div>

      {/* Delete folder confirmation */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal__title">删除文件夹</div>
            <p className="confirm-dialog__msg">
              删除后，该文件夹内的便签将移至"未分类"。此操作不可撤销。
            </p>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={() => setConfirmDelete(null)}>取消</button>
              <button
                className="btn btn--danger"
                onClick={() => { deleteFolder(confirmDelete); setConfirmDelete(null) }}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
