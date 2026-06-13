import { useEffect, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import Image from '@tiptap/extension-image'
import { Pin, PinOff, X, Maximize2, Save } from 'lucide-react'
import { useStore } from '../../store/useStore'

export default function MiniApp() {
  const { init, createNote, updateNote, notes, theme } = useStore()
  const [pinned, setPinned] = useState(true)
  const [saved, setSaved] = useState(false)
  const [noteId, setNoteId] = useState<string | null>(null)

  useEffect(() => { init() }, [])

  useEffect(() => {
    const root = document.documentElement
    const apply = () => {
      const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (theme === 'dark' || (theme === 'system' && dark)) root.setAttribute('data-theme', 'dark')
      else root.removeAttribute('data-theme')
    }
    apply()
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', apply)
    return () => window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', apply)
  }, [theme])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image.configure({ allowBase64: true }),
      Placeholder.configure({ placeholder: '快速记录…' })
    ],
    content: '',
    editorProps: { attributes: { class: 'tiptap-editor selectable' } }
  })

  const handlePin = (v: boolean) => {
    setPinned(v)
    window.api?.miniPin(v)
  }

  const handleSave = async () => {
    const content = editor?.getHTML() ?? ''
    if (!content || content === '<p></p>') return

    if (noteId) {
      await updateNote(noteId, { content })
    } else {
      await createNote()
      // The newly created note is first in the list
      const res = await window.api?.noteList('__all__')
      if (res?.success && res.data.length > 0) {
        const newId = res.data[0].id
        setNoteId(newId)
        await updateNote(newId, { content })
      }
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const openMain = () => {
    window.api?.miniClose()
  }

  return (
    <div className="mini-root">
      <div className="mini-title-bar">
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            className={`traffic-btn traffic-btn--close`}
            onClick={() => window.api?.miniClose()}
            title="关闭"
          >
            <svg viewBox="0 0 8 8" fill="currentColor"><path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="rgba(0,0,0,0.5)" strokeWidth="1.2" strokeLinecap="round"/></svg>
          </button>
        </div>

        <span className="mini-title">Flowna 浮笺</span>

        <div style={{ display: 'flex', gap: 2 }}>
          <button
            className={`mini-btn ${pinned ? 'mini-btn--active' : ''}`}
            onClick={() => handlePin(!pinned)}
            title={pinned ? '取消置顶' : '置顶'}
          >
            {pinned ? <Pin size={13} /> : <PinOff size={13} />}
          </button>
          <button
            className="mini-btn"
            onClick={openMain}
            title="打开主窗口"
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      <div className="mini-editor">
        <EditorContent editor={editor} />
      </div>

      <div className="mini-footer">
        <span className="mini-footer__hint">
          {saved ? '已保存 ✓' : '按 Ctrl+S 保存'}
        </span>
        <button className="mini-footer__save" onClick={handleSave}>
          保存
        </button>
      </div>
    </div>
  )
}
