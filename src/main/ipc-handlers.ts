import { app, ipcMain, dialog, BrowserWindow, shell } from 'electron'
import fs from 'fs'
import path from 'path'
import * as db from './db'
import type { ExportData } from '../shared/types'

export function registerIpcHandlers(): void {
  // ─── Folders ─────────────────────────────────────────────────────────
  ipcMain.handle('folder:list', () => {
    try { return { success: true, data: db.getFolders() } }
    catch (e) { return { success: false, error: String(e) } }
  })

  ipcMain.handle('folder:create', (_e, name: string, color?: string, icon?: string) => {
    try { return { success: true, data: db.createFolder(name, color, icon) } }
    catch (e) { return { success: false, error: String(e) } }
  })

  ipcMain.handle('folder:update', (_e, id: string, updates) => {
    try { db.updateFolder(id, updates); return { success: true, data: null } }
    catch (e) { return { success: false, error: String(e) } }
  })

  ipcMain.handle('folder:delete', (_e, id: string) => {
    try { db.deleteFolder(id); return { success: true, data: null } }
    catch (e) { return { success: false, error: String(e) } }
  })

  // ─── Notes ───────────────────────────────────────────────────────────
  ipcMain.handle('note:list', (_e, folderId?: string) => {
    try {
      const notes = folderId === '__all__'
        ? db.getNotes(undefined)
        : folderId === '__unfiled__'
          ? db.getNotes(null)
          : db.getNotes(folderId)
      return { success: true, data: notes }
    }
    catch (e) { return { success: false, error: String(e) } }
  })

  ipcMain.handle('note:trash-list', () => {
    try { return { success: true, data: db.getDeletedNotes() } }
    catch (e) { return { success: false, error: String(e) } }
  })

  ipcMain.handle('note:by-tag', (_e, tagName: string) => {
    try { return { success: true, data: db.getNotesByTag(tagName) } }
    catch (e) { return { success: false, error: String(e) } }
  })

  ipcMain.handle('note:search', (_e, query: string) => {
    try { return { success: true, data: db.searchNotes(query) } }
    catch (e) { return { success: false, error: String(e) } }
  })

  ipcMain.handle('note:create', (_e, folderId?: string) => {
    try { return { success: true, data: db.createNote(folderId) } }
    catch (e) { return { success: false, error: String(e) } }
  })

  ipcMain.handle('note:update', (_e, id: string, updates) => {
    try {
      db.updateNote(id, updates)
      if (updates.tags !== undefined) {
        db.setNoteTags(id, updates.tags)
      }
      return { success: true, data: null }
    }
    catch (e) { return { success: false, error: String(e) } }
  })

  ipcMain.handle('note:trash', (_e, id: string) => {
    try { db.trashNote(id); return { success: true, data: null } }
    catch (e) { return { success: false, error: String(e) } }
  })

  ipcMain.handle('note:restore', (_e, id: string) => {
    try { db.restoreNote(id); return { success: true, data: null } }
    catch (e) { return { success: false, error: String(e) } }
  })

  ipcMain.handle('note:purge', (_e, id: string) => {
    try { db.purgeNote(id); return { success: true, data: null } }
    catch (e) { return { success: false, error: String(e) } }
  })

  ipcMain.handle('note:empty-trash', () => {
    try { db.emptyTrash(); return { success: true, data: null } }
    catch (e) { return { success: false, error: String(e) } }
  })

  // ─── Batch note operations ──────────────────────────────────────────
  ipcMain.handle('note:batch-trash', (_e, ids: string[]) => {
    try { db.batchTrashNotes(ids); return { success: true, data: null } }
    catch (e) { return { success: false, error: String(e) } }
  })

  ipcMain.handle('note:batch-restore', (_e, ids: string[]) => {
    try { db.batchRestoreNotes(ids); return { success: true, data: null } }
    catch (e) { return { success: false, error: String(e) } }
  })

  ipcMain.handle('note:batch-purge', (_e, ids: string[]) => {
    try { db.batchPurgeNotes(ids); return { success: true, data: null } }
    catch (e) { return { success: false, error: String(e) } }
  })

  ipcMain.handle('note:pin', (_e, id: string, pinned: boolean) => {
    try { db.pinNote(id, pinned); return { success: true, data: null } }
    catch (e) { return { success: false, error: String(e) } }
  })

  // ─── Tags ─────────────────────────────────────────────────────────────
  ipcMain.handle('tag:list', () => {
    try { return { success: true, data: db.getTags() } }
    catch (e) { return { success: false, error: String(e) } }
  })

  ipcMain.handle('tag:list-active', () => {
    try { return { success: true, data: db.getActiveTags() } }
    catch (e) { return { success: false, error: String(e) } }
  })

  // ─── Settings ─────────────────────────────────────────────────────────
  ipcMain.handle('settings:get', (_e, key: string, defaultValue: string) => {
    try { return { success: true, data: db.getSetting(key, defaultValue) } }
    catch (e) { return { success: false, error: String(e) } }
  })

  ipcMain.handle('settings:set', (_e, key: string, value: string) => {
    try { db.setSetting(key, value); return { success: true, data: null } }
    catch (e) { return { success: false, error: String(e) } }
  })

  // ─── Import / Export ──────────────────────────────────────────────────
  ipcMain.handle('db:export', async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      const now = new Date()
      const pad = (n: number): string => String(n).padStart(2, '0')
      const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
      const defaultName = `flowna-backup-${ts}.json`
      const result = await dialog.showSaveDialog(win!, {
        title: '导出便签数据',
        defaultPath: path.join(app.getPath('documents'), defaultName),
        filters: [{ name: 'JSON', extensions: ['json'] }]
      })
      if (result.canceled || !result.filePath) return { success: false, error: 'cancelled' }
      const data = db.exportData()
      fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf-8')
      const { response: btn } = await dialog.showMessageBox(win!, {
        type: 'info',
        title: '导出成功',
        message: '便签数据已成功导出',
        detail: result.filePath,
        buttons: ['打开文件夹', '确定'],
        defaultId: 0,
        cancelId: 1
      })
      if (btn === 0) {
        shell.openPath(path.dirname(result.filePath))
      }
      return { success: true, data: null }
    }
    catch (e) { return { success: false, error: String(e) } }
  })

  ipcMain.handle('db:import', async (event, mode: 'merge' | 'replace') => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      const result = await dialog.showOpenDialog(win!, {
        title: '导入便签数据',
        filters: [{ name: 'JSON', extensions: ['json'] }],
        properties: ['openFile']
      })
      if (result.canceled || result.filePaths.length === 0) return { success: false, error: 'cancelled' }
      const raw = fs.readFileSync(result.filePaths[0], 'utf-8')
      const data: ExportData = JSON.parse(raw)
      db.importData(data, mode)
      return { success: true, data: null }
    }
    catch (e) { return { success: false, error: String(e) } }
  })

  // ─── Window controls ──────────────────────────────────────────────────
  ipcMain.on('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })

  ipcMain.on('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win?.isMaximized()) win.unmaximize()
    else win?.maximize()
  })

  ipcMain.on('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })

  ipcMain.handle('window:is-maximized', (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false
  })
}
