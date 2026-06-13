import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  // Folders
  folderList: () => ipcRenderer.invoke('folder:list'),
  folderCreate: (name: string, color?: string, icon?: string) =>
    ipcRenderer.invoke('folder:create', name, color, icon),
  folderUpdate: (id: string, updates: object) =>
    ipcRenderer.invoke('folder:update', id, updates),
  folderDelete: (id: string) => ipcRenderer.invoke('folder:delete', id),

  // Notes
  noteList: (folderId?: string) => ipcRenderer.invoke('note:list', folderId),
  noteTrashList: () => ipcRenderer.invoke('note:trash-list'),
  noteByTag: (tagName: string) => ipcRenderer.invoke('note:by-tag', tagName),
  noteSearch: (query: string) => ipcRenderer.invoke('note:search', query),
  noteCreate: (folderId?: string) => ipcRenderer.invoke('note:create', folderId),
  noteUpdate: (id: string, updates: object) => ipcRenderer.invoke('note:update', id, updates),
  noteTrash: (id: string) => ipcRenderer.invoke('note:trash', id),
  noteRestore: (id: string) => ipcRenderer.invoke('note:restore', id),
  notePurge: (id: string) => ipcRenderer.invoke('note:purge', id),
  noteEmptyTrash: () => ipcRenderer.invoke('note:empty-trash'),
  noteBatchTrash: (ids: string[]) => ipcRenderer.invoke('note:batch-trash', ids),
  noteBatchRestore: (ids: string[]) => ipcRenderer.invoke('note:batch-restore', ids),
  noteBatchPurge: (ids: string[]) => ipcRenderer.invoke('note:batch-purge', ids),
  notePin: (id: string, pinned: boolean) => ipcRenderer.invoke('note:pin', id, pinned),

  // Tags
  tagList: () => ipcRenderer.invoke('tag:list'),
  tagListActive: () => ipcRenderer.invoke('tag:list-active'),

  // Settings
  settingsGet: (key: string, defaultValue: string) =>
    ipcRenderer.invoke('settings:get', key, defaultValue),
  settingsSet: (key: string, value: string) =>
    ipcRenderer.invoke('settings:set', key, value),

  // Export / Import
  dbExport: () => ipcRenderer.invoke('db:export'),
  dbImport: (mode: 'merge' | 'replace') => ipcRenderer.invoke('db:import', mode),

  // Main window controls
  windowMinimize: () => ipcRenderer.send('window:minimize'),
  windowMaximize: () => ipcRenderer.send('window:maximize'),
  windowClose: () => ipcRenderer.send('window:close'),
  windowIsMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  onWindowMaximized: (cb: (v: boolean) => void) => {
    const handler = (_: unknown, v: boolean) => cb(v)
    ipcRenderer.on('window:maximized', handler)
    return () => ipcRenderer.off('window:maximized', handler)
  },

  // Compact mode (same window, compact layout)
  compactEnter: () => ipcRenderer.send('compact:enter'),
  compactExit: () => ipcRenderer.send('compact:exit'),
  compactSetPin: (pinned: boolean) => ipcRenderer.send('compact:set-pin', pinned),

  platform: process.platform
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('electron', electronAPI)
  contextBridge.exposeInMainWorld('api', api)
} else {
  ;(window as unknown as Record<string, unknown>).electron = electronAPI
  ;(window as unknown as Record<string, unknown>).api = api
}
