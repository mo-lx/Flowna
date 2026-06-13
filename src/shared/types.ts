export interface Folder {
  id: string
  name: string
  color: string
  icon: string
  sortOrder: number
  createdAt: number
  updatedAt: number
}

export interface Note {
  id: string
  title: string
  content: string
  folderId: string | null
  isDeleted: boolean
  deletedAt: number | null
  pinned: boolean
  createdAt: number
  updatedAt: number
  tags: string[]
}

export interface Tag {
  id: string
  name: string
  createdAt: number
  noteCount?: number
}

export interface NoteTag {
  noteId: string
  tagId: string
}

export interface ExportData {
  version: string
  exportedAt: number
  folders: Folder[]
  notes: Note[]
  tags: Tag[]
  noteTags: { noteId: string; tagName: string }[]
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  miniWindowOpacity: number
  miniWindowAlwaysOnTop: boolean
  language: 'zh' | 'en'
}

export type IpcResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }
