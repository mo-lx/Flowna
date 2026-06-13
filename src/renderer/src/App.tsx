import { useEffect } from 'react'
import { useStore } from './store/useStore'
import TitleBar from './components/Layout/TitleBar'
import Sidebar from './components/Layout/Sidebar'
import NoteList from './components/Layout/NoteList'
import NoteEditor from './components/Editor/NoteEditor'
import FolderModal from './components/Modals/FolderModal'
import CompactRoot from './components/Compact/CompactRoot'

export default function App() {
  const { init, theme, showFolderModal, isCompact, createNote, sidebarView } = useStore()

  useEffect(() => { init() }, [])

  // Apply theme to <html>
  useEffect(() => {
    const root = document.documentElement
    const apply = (dark: boolean) => {
      if (dark) root.setAttribute('data-theme', 'dark')
      else root.removeAttribute('data-theme')
    }
    if (theme === 'dark') { apply(true); return undefined }
    if (theme === 'light') { apply(false); return undefined }
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    apply(mq.matches)
    mq.addEventListener('change', (e) => apply(e.matches))
    return () => mq.removeEventListener('change', (e) => apply(e.matches))
  }, [theme])

  // Keyboard shortcuts (main mode only)
  useEffect(() => {
    if (isCompact) return
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      if (ctrl && e.key === 'n' && sidebarView !== 'trash') {
        e.preventDefault(); createNote()
      }
      if (ctrl && e.key === 'f') {
        e.preventDefault()
        document.querySelector<HTMLInputElement>('.search-bar input')?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isCompact, sidebarView, createNote])

  if (isCompact) return <CompactRoot />

  return (
    <div className="app-root">
      <TitleBar />
      <div className="content-area">
        <Sidebar />
        <NoteList />
        <NoteEditor />
      </div>
      {showFolderModal && <FolderModal />}
    </div>
  )
}
