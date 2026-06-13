import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import Highlight from '@tiptap/extension-highlight'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, ListTodo, Quote, Image as ImageIcon,
  ArrowLeft, Trash2, Code, Highlighter, Undo, Redo,
  Save
} from 'lucide-react'
import dayjs from 'dayjs'
import { useStore } from '../../store/useStore'
import TagInput from '../Editor/TagInput'

const SAVE_DELAY = 500

export default function CompactEditor() {
  const { notes, tags, folders, compactEditNoteId, openCompactEditor, updateNote, trashNote, autoSaveEnabled } = useStore()
  const note = notes.find((n) => n.id === compactEditNoteId) ?? null

  const [title, setTitle] = useState('')
  const [noteTags, setNoteTags] = useState<string[]>([])
  const [showFolderMenu, setShowFolderMenu] = useState(false)
  const [folderMenuPos, setFolderMenuPos] = useState({ top: 0, left: 0 })
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved'>('saved')
  const folderBtnRef = useRef<HTMLButtonElement>(null)

  const loadedNoteId = useRef<string | null>(null)
  const savedTitle = useRef('')
  const savedContent = useRef('')
  const savedTags = useRef<string[]>([])
  const titleRef = useRef(title)
  const tagsRef = useRef(noteTags)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  titleRef.current = title
  tagsRef.current = noteTags

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder: '开始记录…' }),
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true })
    ],
    content: '',
    editorProps: { attributes: { class: 'tiptap-editor selectable' } },
    onUpdate: () => { if (autoSaveEnabled) scheduleSave(); else setSaveStatus('unsaved') }
  })

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    if (!note) { loadedNoteId.current = null; setSaveStatus('saved'); return }
    if (note.id === loadedNoteId.current) return
    loadedNoteId.current = note.id
    setTitle(note.title)
    setNoteTags(note.tags)
    editor?.commands.setContent(note.content || '')
    savedTitle.current = note.title
    savedContent.current = note.content
    savedTags.current = [...note.tags]
    setSaveStatus('saved')
  }, [note?.id])

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

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
    const t = titleRef.current
    const c = editor?.getHTML() ?? ''
    const tg = tagsRef.current
    const updates: Record<string, unknown> = {}
    if (t !== savedTitle.current) { updates.title = t; savedTitle.current = t }
    if (c !== savedContent.current) { updates.content = c; savedContent.current = c }
    if (JSON.stringify(tg) !== JSON.stringify(savedTags.current)) {
      updates.tags = tg; savedTags.current = [...tg]
    }
    if (Object.keys(updates).length > 0) {
      updateNote(id, updates as Parameters<typeof updateNote>[1])
    }
    setSaveStatus('saved')
  }, [editor, updateNote])

  const handleTrash = () => {
    if (!compactEditNoteId) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    trashNote(compactEditNoteId)
    openCompactEditor(null)
  }

  const openFolderMenu = () => {
    const r = folderBtnRef.current?.getBoundingClientRect()
    if (r) setFolderMenuPos({ top: r.bottom + 4, left: r.left })
    setShowFolderMenu((v) => !v)
  }

  const insertImage = () => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files?.[0]; if (!file) return
      const reader = new FileReader()
      reader.onload = () => editor?.chain().focus().setImage({ src: reader.result as string }).run()
      reader.readAsDataURL(file)
    }
    input.click()
  }

  const folder = folders.find((f) => f.id === note?.folderId)

  if (!note) return null

  const tb = (active: boolean, title: string, onClick: () => void, icon: React.ReactNode) => (
    <button
      key={title}
      className={`compact-toolbar-btn ${active ? 'compact-toolbar-btn--active' : ''}`}
      onClick={onClick} title={title} type="button"
    >{icon}</button>
  )

  return (
    <div className="compact-editor">
      {/* Nav bar */}
      <div className="compact-editor__nav">
        <button className="compact-editor__back" onClick={() => { flush(); openCompactEditor(null) }}>
          <ArrowLeft size={14} /><span>便签</span>
        </button>

        <button ref={folderBtnRef} className="compact-editor__folder" onClick={openFolderMenu}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: folder?.color ?? 'var(--text-tertiary)', display: 'inline-block', flexShrink: 0 }} />
          <span style={{ fontSize: 11, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {folder?.name ?? '未分类'}
          </span>
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          {!autoSaveEnabled && (
            <button
              className="compact-ctrl-btn"
              style={{ color: saveStatus === 'unsaved' ? 'var(--accent)' : 'var(--text-tertiary)' }}
              onClick={flush}
              title={saveStatus === 'unsaved' ? '保存 (Ctrl+S)' : '已保存'}
            >
              <Save size={12} />
            </button>
          )}
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
            {dayjs(note.updatedAt).format('M/D HH:mm')}
          </span>
          <button className="compact-ctrl-btn compact-ctrl-btn--close" onClick={handleTrash} title="移至回收站">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Simplified toolbar */}
      <div className="compact-toolbar">
        {tb(false, '撤销', () => editor?.chain().focus().undo().run(), <Undo size={12} />)}
        {tb(false, '重做', () => editor?.chain().focus().redo().run(), <Redo size={12} />)}
        <div className="compact-toolbar-divider" />
        {tb(editor?.isActive('bold') ?? false, '粗体', () => editor?.chain().focus().toggleBold().run(), <Bold size={12} />)}
        {tb(editor?.isActive('italic') ?? false, '斜体', () => editor?.chain().focus().toggleItalic().run(), <Italic size={12} />)}
        {tb(editor?.isActive('underline') ?? false, '下划线', () => editor?.chain().focus().toggleUnderline().run(), <UnderlineIcon size={12} />)}
        {tb(editor?.isActive('strike') ?? false, '删除线', () => editor?.chain().focus().toggleStrike().run(), <Strikethrough size={12} />)}
        {tb(editor?.isActive('highlight') ?? false, '高亮', () => editor?.chain().focus().toggleHighlight().run(), <Highlighter size={12} />)}
        <div className="compact-toolbar-divider" />
        {tb(editor?.isActive('bulletList') ?? false, '无序列表', () => editor?.chain().focus().toggleBulletList().run(), <List size={12} />)}
        {tb(editor?.isActive('orderedList') ?? false, '有序列表', () => editor?.chain().focus().toggleOrderedList().run(), <ListOrdered size={12} />)}
        {tb(editor?.isActive('taskList') ?? false, '任务列表', () => editor?.chain().focus().toggleTaskList().run(), <ListTodo size={12} />)}
        {tb(editor?.isActive('blockquote') ?? false, '引用', () => editor?.chain().focus().toggleBlockquote().run(), <Quote size={12} />)}
        {tb(editor?.isActive('code') ?? false, '代码', () => editor?.chain().focus().toggleCode().run(), <Code size={12} />)}
        <div className="compact-toolbar-divider" />
        {tb(false, '插入图片', insertImage, <ImageIcon size={12} />)}
      </div>

      {/* Title */}
      <div className="compact-editor__title-area">
        <textarea
          className="compact-editor__title selectable"
          placeholder="便签标题…"
          value={title}
          rows={1}
          onChange={(e) => {
            e.target.style.height = 'auto'
            e.target.style.height = e.target.scrollHeight + 'px'
            setTitle(e.target.value)
            if (autoSaveEnabled) scheduleSave()
            else setSaveStatus('unsaved')
          }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); editor?.commands.focus() } }}
        />
      </div>

      {/* Content */}
      <div className="compact-editor__content">
        <EditorContent editor={editor} />
      </div>

      {/* Tags */}
      <div className="compact-editor__tags">
        <TagInput
          tags={noteTags}
          onChange={(t) => { setNoteTags(t); if (autoSaveEnabled) scheduleSave(); else setSaveStatus('unsaved') }}
          allTags={tags.map((t) => t.name)}
        />
      </div>

      {/* Portaled folder dropdown */}
      {showFolderMenu && createPortal(
        <>
          <div className="compact-portal-overlay" onClick={() => setShowFolderMenu(false)} />
          <div className="compact-dropdown" style={{ top: folderMenuPos.top, left: folderMenuPos.left }}>
            <div
              className={`compact-dropdown-item ${!note.folderId ? 'compact-dropdown-item--active' : ''}`}
              onClick={() => { updateNote(note.id, { folderId: null }); setShowFolderMenu(false) }}
            >
              未分类
            </div>
            {folders.map((f) => (
              <div
                key={f.id}
                className={`compact-dropdown-item ${note.folderId === f.id ? 'compact-dropdown-item--active' : ''}`}
                onClick={() => { updateNote(note.id, { folderId: f.id }); setShowFolderMenu(false) }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: f.color, display: 'inline-block', flexShrink: 0 }} />
                {f.name}
              </div>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
