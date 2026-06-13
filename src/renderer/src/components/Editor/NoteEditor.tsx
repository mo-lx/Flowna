import { useEffect, useRef, useState, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import dayjs from 'dayjs'
import { Trash2, FolderOpen, Save } from 'lucide-react'
import { useStore } from '../../store/useStore'
import EditorToolbar from './EditorToolbar'
import TagInput from './TagInput'

const SAVE_DELAY = 500

export default function NoteEditor() {
  const {
    notes, selectedNoteId, folders, tags, sidebarView,
    updateNote, trashNote, autoSaveEnabled
  } = useStore()

  const note = notes.find((n) => n.id === selectedNoteId) ?? null

  const [title, setTitle] = useState('')
  const [noteTags, setNoteTags] = useState<string[]>([])
  const [showFolderMenu, setShowFolderMenu] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved'>('saved')

  // Track which note is loaded in editor to avoid stale-closure overwrites
  const loadedNoteId = useRef<string | null>(null)
  // Track last-persisted values so we only write actual changes
  const savedTitle = useRef('')
  const savedContent = useRef('')
  const savedTags = useRef<string[]>([])
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder: '开始记录…' }),
      Highlight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList,
      TaskItem.configure({ nested: true })
    ],
    content: '',
    editorProps: { attributes: { class: 'tiptap-editor selectable' } },
    onUpdate: () => { if (autoSaveEnabled) scheduleSave(); else setSaveStatus('unsaved') }
  })

  // When selected note changes, load it into local state + editor
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)

    if (!note) {
      loadedNoteId.current = null
      setTitle('')
      setNoteTags([])
      editor?.commands.setContent('')
      savedTitle.current = ''
      savedContent.current = ''
      savedTags.current = []
      setSaveStatus('saved')
      return
    }

    if (note.id === loadedNoteId.current) return // same note already loaded

    loadedNoteId.current = note.id
    setTitle(note.title)
    setNoteTags(note.tags)
    editor?.commands.setContent(note.content || '')
    savedTitle.current = note.title
    savedContent.current = note.content
    savedTags.current = note.tags
    setSaveStatus('saved')
  }, [note?.id])

  // Flush save on unmount
  useEffect(() => {
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [])

  // Ctrl+S shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      if (ctrl && e.key === 's') {
        e.preventDefault()
        flush()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  function scheduleSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(flush, SAVE_DELAY)
  }

  const flush = useCallback(() => {
    const id = loadedNoteId.current
    if (!id) return
    // Read current UI state directly from refs/DOM to avoid stale closures
    const currentTitle = titleRef.current
    const currentContent = editor?.getHTML() ?? ''
    const currentTags = tagsRef.current

    const updates: Record<string, unknown> = {}
    if (currentTitle !== savedTitle.current) { updates.title = currentTitle; savedTitle.current = currentTitle }
    if (currentContent !== savedContent.current) { updates.content = currentContent; savedContent.current = currentContent }
    if (JSON.stringify(currentTags) !== JSON.stringify(savedTags.current)) {
      updates.tags = currentTags; savedTags.current = currentTags
    }
    if (Object.keys(updates).length > 0) {
      updateNote(id, updates as Parameters<typeof updateNote>[1])
    }
    setSaveStatus('saved')
  }, [editor, updateNote])

  // Sync mutable refs so flush() always reads fresh values
  const titleRef = useRef(title)
  const tagsRef = useRef(noteTags)
  titleRef.current = title
  tagsRef.current = noteTags

  const handleTitleChange = (v: string) => {
    setTitle(v)
    if (autoSaveEnabled) scheduleSave()
    else setSaveStatus('unsaved')
  }
  const handleTagsChange = (t: string[]) => {
    setNoteTags(t)
    if (autoSaveEnabled) scheduleSave()
    else setSaveStatus('unsaved')
  }

  const handleFolderSelect = (folderId: string | null) => {
    if (!selectedNoteId) return
    updateNote(selectedNoteId, { folderId })
    setShowFolderMenu(false)
  }

  const handleTrash = () => {
    if (!selectedNoteId) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    trashNote(selectedNoteId)
  }

  if (sidebarView === 'trash') {
    return (
      <div className="editor-empty-state">
        <span className="editor-empty-state__icon"><Trash2 size={48} strokeWidth={1} /></span>
        <h3>回收站</h3>
        <p>从左侧列表选择便签可恢复或永久删除</p>
      </div>
    )
  }

  if (!note) {
    return (
      <div className="editor-empty-state">
        <span className="editor-empty-state__icon">
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="8" y="6" width="36" height="44" rx="4"/>
            <line x1="16" y1="18" x2="36" y2="18"/>
            <line x1="16" y1="26" x2="36" y2="26"/>
            <line x1="16" y1="34" x2="28" y2="34"/>
          </svg>
        </span>
        <h3>选择一条便签</h3>
        <p>或点击「+」新建</p>
      </div>
    )
  }

  const folder = folders.find((f) => f.id === note.folderId)
  const allTagNames = tags.map((t) => t.name)

  return (
    <div className="editor-area">
      <EditorToolbar editor={editor} />

      <div className="editor-header">
        <textarea
          className="editor-title-input selectable"
          placeholder="便签标题…"
          value={title}
          rows={1}
          style={{ height: 'auto' }}
          ref={(el) => {
            if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' }
          }}
          onChange={(e) => {
            e.target.style.height = 'auto'
            e.target.style.height = e.target.scrollHeight + 'px'
            handleTitleChange(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); editor?.commands.focus() }
          }}
        />

        <div className="editor-meta">
          <span className="editor-meta__date">
            {dayjs(note.updatedAt).format('YYYY年M月D日 HH:mm')} 修改
          </span>

          <div style={{ position: 'relative' }}>
            <button className="editor-meta__folder" onClick={() => setShowFolderMenu((v) => !v)}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: folder?.color ?? 'var(--text-tertiary)',
                display: 'inline-block'
              }} />
              {folder?.name ?? '未分类'}
            </button>

            {showFolderMenu && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 299 }} onClick={() => setShowFolderMenu(false)} />
                <div className="folder-select-menu">
                  <div
                    className={`folder-select-item ${!note.folderId ? 'folder-select-item--active' : ''}`}
                    onClick={() => handleFolderSelect(null)}
                  >
                    <FolderOpen size={13} /> 未分类
                  </div>
                  {folders.map((f) => (
                    <div
                      key={f.id}
                      className={`folder-select-item ${note.folderId === f.id ? 'folder-select-item--active' : ''}`}
                      onClick={() => handleFolderSelect(f.id)}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: f.color, flexShrink: 0, display: 'inline-block' }} />
                      {f.name}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
            {!autoSaveEnabled && (
              <button
                className="icon-btn"
                style={{ color: saveStatus === 'unsaved' ? 'var(--accent)' : 'var(--text-tertiary)' }}
                onClick={flush}
                title={saveStatus === 'unsaved' ? '保存 (Ctrl+S)' : '已保存'}
              >
                <Save size={15} />
              </button>
            )}
            <button className="icon-btn" style={{ color: 'var(--red)' }} onClick={handleTrash} title="移至回收站">
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        <TagInput tags={noteTags} onChange={handleTagsChange} allTags={allTagNames} />
      </div>

      <div className="editor-scroll">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
