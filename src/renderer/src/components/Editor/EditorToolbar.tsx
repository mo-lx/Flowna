import type { Editor } from '@tiptap/react'
import {
  Bold, Italic, Underline, Strikethrough, Code, Code2,
  Heading1, Heading2, Heading3, List, ListOrdered, ListTodo,
  AlignLeft, AlignCenter, AlignRight, Quote, Highlighter,
  Image, Undo, Redo, Link
} from 'lucide-react'

interface Props { editor: Editor | null }

export default function EditorToolbar({ editor }: Props) {
  if (!editor) return null

  const btn = (
    label: string,
    active: boolean,
    onClick: () => void,
    icon: React.ReactNode
  ) => (
    <button
      key={label}
      className={`toolbar-btn ${active ? 'toolbar-btn--active' : ''}`}
      onClick={onClick}
      title={label}
      type="button"
    >
      {icon}
    </button>
  )

  const insertImage = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        editor.chain().focus().setImage({ src: reader.result as string }).run()
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  return (
    <div className="editor-toolbar">
      {btn('撤销', false, () => editor.chain().focus().undo().run(), <Undo size={14} />)}
      {btn('重做', false, () => editor.chain().focus().redo().run(), <Redo size={14} />)}
      <div className="toolbar-divider" />

      {btn('标题1', editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), <Heading1 size={14} />)}
      {btn('标题2', editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), <Heading2 size={14} />)}
      {btn('标题3', editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), <Heading3 size={14} />)}
      <div className="toolbar-divider" />

      {btn('粗体', editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), <Bold size={14} />)}
      {btn('斜体', editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), <Italic size={14} />)}
      {btn('下划线', editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), <Underline size={14} />)}
      {btn('删除线', editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run(), <Strikethrough size={14} />)}
      {btn('高亮', editor.isActive('highlight'), () => editor.chain().focus().toggleHighlight().run(), <Highlighter size={14} />)}
      <div className="toolbar-divider" />

      {btn('无序列表', editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), <List size={14} />)}
      {btn('有序列表', editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered size={14} />)}
      {btn('任务列表', editor.isActive('taskList'), () => editor.chain().focus().toggleTaskList().run(), <ListTodo size={14} />)}
      <div className="toolbar-divider" />

      {btn('引用', editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run(), <Quote size={14} />)}
      {btn('行内代码', editor.isActive('code'), () => editor.chain().focus().toggleCode().run(), <Code size={14} />)}
      {btn('代码块', editor.isActive('codeBlock'), () => editor.chain().focus().toggleCodeBlock().run(), <Code2 size={14} />)}
      <div className="toolbar-divider" />

      {btn('左对齐', editor.isActive({ textAlign: 'left' }), () => editor.chain().focus().setTextAlign('left').run(), <AlignLeft size={14} />)}
      {btn('居中', editor.isActive({ textAlign: 'center' }), () => editor.chain().focus().setTextAlign('center').run(), <AlignCenter size={14} />)}
      {btn('右对齐', editor.isActive({ textAlign: 'right' }), () => editor.chain().focus().setTextAlign('right').run(), <AlignRight size={14} />)}
      <div className="toolbar-divider" />

      {btn('插入图片', false, insertImage, <Image size={14} />)}
    </div>
  )
}
