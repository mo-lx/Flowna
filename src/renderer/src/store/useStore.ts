import { create } from 'zustand'
import type { Folder, Note, Tag } from '../../../shared/types'

declare global {
  interface Window {
    api: {
      folderList: () => Promise<{ success: boolean; data: Folder[] }>
      folderCreate: (name: string, color?: string, icon?: string) => Promise<{ success: boolean; data: Folder }>
      folderUpdate: (id: string, updates: object) => Promise<{ success: boolean; data: null }>
      folderDelete: (id: string) => Promise<{ success: boolean; data: null }>
      noteList: (folderId?: string) => Promise<{ success: boolean; data: Note[] }>
      noteTrashList: () => Promise<{ success: boolean; data: Note[] }>
      noteByTag: (tagName: string) => Promise<{ success: boolean; data: Note[] }>
      noteSearch: (query: string) => Promise<{ success: boolean; data: Note[] }>
      noteCreate: (folderId?: string) => Promise<{ success: boolean; data: Note }>
      noteUpdate: (id: string, updates: object) => Promise<{ success: boolean; data: null }>
      noteTrash: (id: string) => Promise<{ success: boolean; data: null }>
      noteRestore: (id: string) => Promise<{ success: boolean; data: null }>
      notePurge: (id: string) => Promise<{ success: boolean; data: null }>
      noteEmptyTrash: () => Promise<{ success: boolean; data: null }>
      noteBatchTrash: (ids: string[]) => Promise<{ success: boolean; data: null }>
      noteBatchRestore: (ids: string[]) => Promise<{ success: boolean; data: null }>
      noteBatchPurge: (ids: string[]) => Promise<{ success: boolean; data: null }>
      notePin: (id: string, pinned: boolean) => Promise<{ success: boolean; data: null }>
      tagList: () => Promise<{ success: boolean; data: Tag[] }>
      tagListActive: () => Promise<{ success: boolean; data: Tag[] }>
      settingsGet: (key: string, defaultValue: string) => Promise<{ success: boolean; data: string }>
      settingsSet: (key: string, value: string) => Promise<{ success: boolean; data: null }>
      dbExport: () => Promise<{ success: boolean; data: null }>
      dbImport: (mode: 'merge' | 'replace') => Promise<{ success: boolean; data: null }>
      windowMinimize: () => void
      windowMaximize: () => void
      windowClose: () => void
      windowIsMaximized: () => Promise<boolean>
      onWindowMaximized: (cb: (v: boolean) => void) => () => void
      compactEnter: () => void
      compactExit: () => void
      compactSetPin: (pinned: boolean) => void
      platform: string
    }
  }
}

export type SidebarView = 'all' | 'unfiled' | 'folder' | 'tag' | 'trash'
export type SortKey = 'updatedAt' | 'createdAt' | 'title'
export type CompactAlpha = 0.55 | 0.70 | 0.85 | 1.0

function computeDisplayed(
  notes: Note[],
  sidebarView: SidebarView,
  selectedFolderId: string | null,
  selectedTag: string | null,
  searchQuery: string,
  sortKey: SortKey,
  sortAsc: boolean
): Note[] {
  let list = [...notes]
  // Filter by sidebar view
  if (sidebarView === 'unfiled') {
    list = list.filter((n) => !n.folderId && !n.isDeleted)
  } else if (sidebarView === 'folder' && selectedFolderId) {
    list = list.filter((n) => n.folderId === selectedFolderId && !n.isDeleted)
  } else if (sidebarView === 'tag' && selectedTag) {
    list = list.filter((n) => n.tags.includes(selectedTag) && !n.isDeleted)
  } else if (sidebarView === 'trash') {
    list = list.filter((n) => n.isDeleted)
  } else {
    // 'all' view — exclude deleted notes
    list = list.filter((n) => !n.isDeleted)
  }
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase()
    list = list.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q))
    )
  }
  list.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    let av: string | number, bv: string | number
    if (sortKey === 'title') { av = a.title.toLowerCase(); bv = b.title.toLowerCase() }
    else { av = a[sortKey]; bv = b[sortKey] }
    if (av < bv) return sortAsc ? -1 : 1
    if (av > bv) return sortAsc ? 1 : -1
    return 0
  })
  return list
}

function computeCompactNotes(
  allNotes: Note[],
  folderFilter: string | null,
  tagFilter: string | null,
  searchQuery: string,
  sortKey: SortKey,
  sortAsc: boolean
): Note[] {
  let list = allNotes.filter((n) => !n.isDeleted)
  if (folderFilter === '__unfiled__') {
    list = list.filter((n) => !n.folderId)
  } else if (folderFilter && folderFilter !== '__all__') {
    list = list.filter((n) => n.folderId === folderFilter)
  }
  if (tagFilter) {
    list = list.filter((n) => n.tags.includes(tagFilter))
  }
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase()
    list = list.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q))
    )
  }
  list.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    let av: string | number, bv: string | number
    if (sortKey === 'title') { av = a.title.toLowerCase(); bv = b.title.toLowerCase() }
    else { av = a[sortKey]; bv = b[sortKey] }
    if (av < bv) return sortAsc ? -1 : 1
    if (av > bv) return sortAsc ? 1 : -1
    return 0
  })
  return list
}

interface AppStore {
  // ── Full-mode data ──────────────────────────────────────────────────────
  notes: Note[]
  folders: Folder[]
  tags: Tag[]
  selectedNoteId: string | null
  selectedNoteIds: Set<string>
  listDensity: 'comfortable' | 'compact'
  sidebarView: SidebarView
  selectedFolderId: string | null
  selectedTag: string | null
  searchQuery: string
  sortKey: SortKey
  sortAsc: boolean
  isLoading: boolean
  showFolderModal: boolean
  editingFolder: Folder | null
  theme: 'light' | 'dark' | 'system'
  displayedNotes: Note[]
  autoSaveEnabled: boolean

  // ── Compact mode ───────────────────────────────────────────────────────
  isCompact: boolean
  compactPinned: boolean
  compactAlpha: CompactAlpha
  compactEditNoteId: string | null   // note open in compact editor; null = show card list
  compactFolderFilter: string | null // '__all__' | folder id | '__unfiled__'
  compactTagFilter: string | null
  compactSearchQuery: string
  compactSortKey: SortKey
  compactSortAsc: boolean
  compactNotes: Note[]               // derived: filtered notes for compact view

  // ── Actions ────────────────────────────────────────────────────────────
  init: () => Promise<void>
  loadNotes: () => Promise<void>
  loadFolders: () => Promise<void>
  loadTags: () => Promise<void>
  selectNote: (id: string | null) => void
  toggleSelectNote: (id: string) => void
  selectAllNotes: () => void
  deselectAllNotes: () => void
  batchTrashNotes: () => Promise<void>
  batchRestoreNotes: () => Promise<void>
  batchPurgeNotes: () => Promise<void>
  pinNote: (id: string, pinned: boolean) => Promise<void>
  setListDensity: (d: 'comfortable' | 'compact') => void
  selectAll: () => void
  selectFolder: (id: string) => void
  selectTag: (name: string) => void
  selectTrash: () => void
  selectUnfiled: () => void
  setSearchQuery: (q: string) => void
  setSortKey: (k: SortKey) => void
  setSortAsc: (v: boolean) => void
  createNote: (folderId?: string | null) => Promise<void>
  updateNote: (id: string, updates: { title?: string; content?: string; folderId?: string | null; tags?: string[] }) => Promise<void>
  trashNote: (id: string) => Promise<void>
  restoreNote: (id: string) => Promise<void>
  purgeNote: (id: string) => Promise<void>
  emptyTrash: () => Promise<void>
  createFolder: (name: string, color: string) => Promise<void>
  updateFolder: (id: string, updates: Partial<Folder>) => Promise<void>
  deleteFolder: (id: string) => Promise<void>
  openFolderModal: (folder?: Folder) => void
  closeFolderModal: () => void
  setTheme: (t: 'light' | 'dark' | 'system') => void
  setAutoSaveEnabled: (v: boolean) => Promise<void>
  exportDb: () => Promise<void>
  importDb: (mode: 'merge' | 'replace') => Promise<void>

  // Compact actions
  enterCompact: () => void
  exitCompact: () => void
  setCompactPinned: (v: boolean) => void
  setCompactAlpha: (v: CompactAlpha) => void
  openCompactEditor: (noteId: string | null) => void
  setCompactFolderFilter: (v: string | null) => void
  setCompactTagFilter: (v: string | null) => void
  setCompactSearchQuery: (q: string) => void
  setCompactSortKey: (k: SortKey) => void
  setCompactSortAsc: (v: boolean) => void
  createCompactNote: () => Promise<void>
}

export const useStore = create<AppStore>((set, get) => ({
  notes: [],
  folders: [],
  tags: [],
  selectedNoteId: null,
  selectedNoteIds: new Set<string>(),
  listDensity: 'comfortable',
  sidebarView: 'all',
  selectedFolderId: null,
  selectedTag: null,
  searchQuery: '',
  sortKey: 'updatedAt',
  sortAsc: false,
  isLoading: false,
  showFolderModal: false,
  editingFolder: null,
  theme: 'system',
  displayedNotes: [],
  autoSaveEnabled: true,

  isCompact: false,
  compactPinned: true,
  compactAlpha: 0.85,
  compactEditNoteId: null,
  compactFolderFilter: '__all__',
  compactTagFilter: null,
  compactSearchQuery: '',
  compactSortKey: 'updatedAt',
  compactSortAsc: false,
  compactNotes: [],

  init: async () => {
    await Promise.all([get().loadFolders(), get().loadTags()])
    await get().loadNotes()
    const themeRes = await window.api.settingsGet('theme', 'system')
    if (themeRes.success) set({ theme: themeRes.data as 'light' | 'dark' | 'system' })
    const autoSaveRes = await window.api.settingsGet('autoSave', 'true')
    if (autoSaveRes.success) set({ autoSaveEnabled: autoSaveRes.data === 'true' })
  },

  loadNotes: async () => {
    const { sidebarView, selectedFolderId, selectedTag, searchQuery, sortKey, sortAsc,
      compactFolderFilter, compactTagFilter, compactSearchQuery, compactSortKey, compactSortAsc } = get()
    set({ isLoading: true })
    try {
      // Always fetch all notes for compact view
      const allRes = await window.api.noteList('__all__')
      const allNotes = allRes.success ? allRes.data : []

      let displayRes: { success: boolean; data: Note[] }
      if (sidebarView === 'trash') {
        displayRes = await window.api.noteTrashList()
      } else if (sidebarView === 'tag' && selectedTag) {
        displayRes = await window.api.noteByTag(selectedTag)
      } else if (sidebarView === 'all') {
        displayRes = allRes
      } else if (sidebarView === 'unfiled') {
        displayRes = await window.api.noteList('__unfiled__')
      } else if (sidebarView === 'folder' && selectedFolderId) {
        displayRes = await window.api.noteList(selectedFolderId)
      } else {
        displayRes = allRes
      }

      const displayed = displayRes.success
        ? computeDisplayed(displayRes.data, sidebarView, selectedFolderId, selectedTag, searchQuery, sortKey, sortAsc)
        : []
      const compactNotes = computeCompactNotes(allNotes, compactFolderFilter, compactTagFilter, compactSearchQuery, compactSortKey, compactSortAsc)

      set({ notes: allNotes, displayedNotes: displayed, compactNotes })
    } finally {
      set({ isLoading: false })
    }
  },

  loadFolders: async () => {
    const res = await window.api.folderList()
    if (res.success) set({ folders: res.data })
  },

  loadTags: async () => {
    const res = await window.api.tagListActive()
    if (res.success) set({ tags: res.data })
  },

  selectNote: (id) => set({ selectedNoteId: id, selectedNoteIds: new Set() }),

  toggleSelectNote: (id) => set((state) => {
    const next = new Set(state.selectedNoteIds)
    if (next.has(id)) next.delete(id); else next.add(id)
    return { selectedNoteIds: next }
  }),

  selectAllNotes: () => set((state) => {
    const ids = state.displayedNotes.map((n) => n.id)
    return { selectedNoteIds: new Set(ids) }
  }),

  deselectAllNotes: () => set({ selectedNoteIds: new Set() }),

  batchTrashNotes: async () => {
    const ids = [...get().selectedNoteIds]
    if (ids.length === 0) return
    await window.api.noteBatchTrash(ids)
    set((state) => {
      const idSet = new Set(ids)
      const notes = state.notes.filter((n) => !idSet.has(n.id))
      const displayed = computeDisplayed(notes, state.sidebarView, state.selectedFolderId, state.selectedTag, state.searchQuery, state.sortKey, state.sortAsc)
      const compactNotes = computeCompactNotes(notes, state.compactFolderFilter, state.compactTagFilter, state.compactSearchQuery, state.compactSortKey, state.compactSortAsc)
      const selectedNoteId = idSet.has(state.selectedNoteId!) ? (displayed[0]?.id ?? null) : state.selectedNoteId
      return { notes, displayedNotes: displayed, compactNotes, selectedNoteId, selectedNoteIds: new Set() }
    })
    await get().loadTags()
  },

  batchRestoreNotes: async () => {
    const ids = [...get().selectedNoteIds]
    if (ids.length === 0) return
    await window.api.noteBatchRestore(ids)
    set({ selectedNoteIds: new Set() })
    await get().loadNotes()
    await get().loadTags()
  },

  batchPurgeNotes: async () => {
    const ids = [...get().selectedNoteIds]
    if (ids.length === 0) return
    await window.api.noteBatchPurge(ids)
    set({ selectedNoteIds: new Set() })
    await get().loadNotes()
    await get().loadTags()
  },

  pinNote: async (id, pinned) => {
    await window.api.notePin(id, pinned)
    set((state) => {
      const notes = state.notes.map((n) => n.id === id ? { ...n, pinned } : n)
      const displayed = computeDisplayed(notes, state.sidebarView, state.selectedFolderId, state.selectedTag, state.searchQuery, state.sortKey, state.sortAsc)
      const compactNotes = computeCompactNotes(notes, state.compactFolderFilter, state.compactTagFilter, state.compactSearchQuery, state.compactSortKey, state.compactSortAsc)
      return { notes, displayedNotes: displayed, compactNotes }
    })
  },

  setListDensity: (d) => set({ listDensity: d }),

  selectAll: () => {
    set({ sidebarView: 'all', selectedFolderId: null, selectedTag: null, selectedNoteId: null, selectedNoteIds: new Set() })
    setTimeout(() => get().loadNotes(), 0)
  },
  selectFolder: (id) => {
    set({ sidebarView: 'folder', selectedFolderId: id, selectedTag: null, selectedNoteId: null })
    setTimeout(() => get().loadNotes(), 0)
  },
  selectTag: (name) => {
    set({ sidebarView: 'tag', selectedTag: name, selectedFolderId: null, selectedNoteId: null })
    setTimeout(() => get().loadNotes(), 0)
  },
  selectTrash: () => {
    set({ sidebarView: 'trash', selectedFolderId: null, selectedTag: null, selectedNoteId: null })
    setTimeout(() => get().loadNotes(), 0)
  },
  selectUnfiled: () => {
    set({ sidebarView: 'unfiled', selectedFolderId: null, selectedTag: null, selectedNoteId: null })
    setTimeout(() => get().loadNotes(), 0)
  },

  setSearchQuery: (q) => {
    const { notes, sidebarView, selectedFolderId, selectedTag, sortKey, sortAsc } = get()
    const displayed = computeDisplayed(notes, sidebarView, selectedFolderId, selectedTag, q, sortKey, sortAsc)
    set({ searchQuery: q, displayedNotes: displayed })
    if (q) setTimeout(() => get().loadNotes(), 0)
  },
  setSortKey: (k) => {
    const { notes, sidebarView, selectedFolderId, selectedTag, searchQuery, sortAsc } = get()
    const displayed = computeDisplayed(notes, sidebarView, selectedFolderId, selectedTag, searchQuery, k, sortAsc)
    set({ sortKey: k, displayedNotes: displayed })
  },
  setSortAsc: (v) => {
    const { notes, sidebarView, selectedFolderId, selectedTag, searchQuery, sortKey } = get()
    const displayed = computeDisplayed(notes, sidebarView, selectedFolderId, selectedTag, searchQuery, sortKey, v)
    set({ sortAsc: v, displayedNotes: displayed })
  },

  createNote: async (folderId) => {
    const { sidebarView, selectedFolderId } = get()
    const id = folderId !== undefined ? folderId : (sidebarView === 'folder' ? selectedFolderId ?? undefined : undefined)
    const res = await window.api.noteCreate(id ?? undefined)
    if (res.success) {
      await get().loadNotes()
      await get().loadTags()
      set({ selectedNoteId: res.data.id })
    }
  },

  updateNote: async (id, updates) => {
    await window.api.noteUpdate(id, updates)
    set((state) => {
      const notes = state.notes.map((n) => {
        if (n.id !== id) return n
        return {
          ...n,
          ...(updates.title !== undefined ? { title: updates.title } : {}),
          ...(updates.content !== undefined ? { content: updates.content } : {}),
          ...(updates.folderId !== undefined ? { folderId: updates.folderId } : {}),
          ...(updates.tags !== undefined ? { tags: updates.tags } : {}),
          updatedAt: Date.now()
        }
      })
      const displayed = computeDisplayed(notes, state.sidebarView, state.selectedFolderId, state.selectedTag, state.searchQuery, state.sortKey, state.sortAsc)
      const compactNotes = computeCompactNotes(notes, state.compactFolderFilter, state.compactTagFilter, state.compactSearchQuery, state.compactSortKey, state.compactSortAsc)
      return { notes, displayedNotes: displayed, compactNotes }
    })
    if (updates.tags !== undefined) await get().loadTags()
  },

  trashNote: async (id) => {
    await window.api.noteTrash(id)
    set((state) => {
      const notes = state.notes.filter((n) => n.id !== id)
      const displayed = computeDisplayed(notes, state.sidebarView, state.selectedFolderId, state.selectedTag, state.searchQuery, state.sortKey, state.sortAsc)
      const compactNotes = computeCompactNotes(notes, state.compactFolderFilter, state.compactTagFilter, state.compactSearchQuery, state.compactSortKey, state.compactSortAsc)
      const selectedNoteId = state.selectedNoteId === id ? (displayed[0]?.id ?? null) : state.selectedNoteId
      const compactEditNoteId = state.compactEditNoteId === id ? null : state.compactEditNoteId
      return { notes, displayedNotes: displayed, compactNotes, selectedNoteId, compactEditNoteId }
    })
    await get().loadTags()
  },
  restoreNote: async (id) => { await window.api.noteRestore(id); await get().loadNotes(); await get().loadTags() },
  purgeNote: async (id) => { await window.api.notePurge(id); await get().loadNotes(); await get().loadTags() },
  emptyTrash: async () => { await window.api.noteEmptyTrash(); await get().loadNotes(); await get().loadTags(); set({ selectedNoteId: null }) },

  createFolder: async (name, color) => { await window.api.folderCreate(name, color); await get().loadFolders() },
  updateFolder: async (id, updates) => { await window.api.folderUpdate(id, updates); await get().loadFolders() },
  deleteFolder: async (id) => {
    await window.api.folderDelete(id)
    await get().loadFolders()
    if (get().selectedFolderId === id) get().selectAll()
  },
  openFolderModal: (folder) => set({ showFolderModal: true, editingFolder: folder ?? null }),
  closeFolderModal: () => set({ showFolderModal: false, editingFolder: null }),

  setTheme: async (t) => {
    set({ theme: t })
    await window.api.settingsSet('theme', t)
  },
  setAutoSaveEnabled: async (v) => {
    set({ autoSaveEnabled: v })
    await window.api.settingsSet('autoSave', String(v))
  },
  exportDb: async () => { await window.api.dbExport() },
  importDb: async (mode) => {
    const res = await window.api.dbImport(mode)
    if (res.success) { await get().loadFolders(); await get().loadTags(); await get().loadNotes() }
  },

  // ── Compact actions ──────────────────────────────────────────────────────

  enterCompact: () => {
    window.api.compactEnter()
    set({ isCompact: true, compactPinned: true })
  },
  exitCompact: () => {
    window.api.compactExit()
    set({ isCompact: false, compactEditNoteId: null })
  },
  setCompactPinned: (v) => {
    window.api.compactSetPin(v)
    set({ compactPinned: v })
  },
  setCompactAlpha: (v) => set({ compactAlpha: v }),

  openCompactEditor: (noteId) => {
    set({ compactEditNoteId: noteId })
    // Sync with main-mode selection so switching back feels seamless
    if (noteId) set({ selectedNoteId: noteId })
  },

  setCompactFolderFilter: (v) => {
    const { notes, compactTagFilter, compactSearchQuery, compactSortKey, compactSortAsc } = get()
    const compactNotes = computeCompactNotes(notes, v, compactTagFilter, compactSearchQuery, compactSortKey, compactSortAsc)
    set({ compactFolderFilter: v, compactNotes, compactEditNoteId: null })
  },
  setCompactTagFilter: (v) => {
    const { notes, compactFolderFilter, compactSearchQuery, compactSortKey, compactSortAsc } = get()
    const compactNotes = computeCompactNotes(notes, compactFolderFilter, v, compactSearchQuery, compactSortKey, compactSortAsc)
    set({ compactTagFilter: v, compactNotes, compactEditNoteId: null })
  },
  setCompactSearchQuery: (q) => {
    const { notes, compactFolderFilter, compactTagFilter, compactSortKey, compactSortAsc } = get()
    const compactNotes = computeCompactNotes(notes, compactFolderFilter, compactTagFilter, q, compactSortKey, compactSortAsc)
    set({ compactSearchQuery: q, compactNotes })
  },
  setCompactSortKey: (k) => {
    const { notes, compactFolderFilter, compactTagFilter, compactSearchQuery, compactSortAsc } = get()
    const compactNotes = computeCompactNotes(notes, compactFolderFilter, compactTagFilter, compactSearchQuery, k, compactSortAsc)
    set({ compactSortKey: k, compactNotes })
  },
  setCompactSortAsc: (v) => {
    const { notes, compactFolderFilter, compactTagFilter, compactSearchQuery, compactSortKey } = get()
    const compactNotes = computeCompactNotes(notes, compactFolderFilter, compactTagFilter, compactSearchQuery, compactSortKey, v)
    set({ compactSortAsc: v, compactNotes })
  },

  createCompactNote: async () => {
    const { compactFolderFilter } = get()
    const folderId = compactFolderFilter && compactFolderFilter !== '__all__' && compactFolderFilter !== '__unfiled__'
      ? compactFolderFilter
      : undefined
    const res = await window.api.noteCreate(folderId)
    if (res.success) {
      await get().loadNotes()
      await get().loadTags()
      set({ compactEditNoteId: res.data.id, selectedNoteId: res.data.id })
    }
  }
}))
