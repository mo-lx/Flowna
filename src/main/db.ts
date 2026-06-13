import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import type { Folder, Note, Tag, ExportData } from '../shared/types'

const DB_PATH = path.join(app.getPath('userData'), 'flowna.db')

let db: Database.Database

export function initDb(): void {
  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  createTables()
  scheduleTrashCleanup()
}

function createTables(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#0071e3',
      icon TEXT DEFAULT 'folder',
      sort_order INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT DEFAULT '',
      content TEXT DEFAULT '',
      folder_id TEXT,
      is_deleted INTEGER DEFAULT 0,
      deleted_at INTEGER,
      pinned INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS note_tags (
      note_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (note_id, tag_id),
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
  // Migration: add pinned column if upgrading from older schema
  try { db.exec(`ALTER TABLE notes ADD COLUMN pinned INTEGER DEFAULT 0`) } catch { /* already exists */ }
}

function scheduleTrashCleanup(): void {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
  db.prepare(`DELETE FROM notes WHERE is_deleted = 1 AND deleted_at < ?`).run(thirtyDaysAgo)
}

function toNote(row: Record<string, unknown>): Note {
  const tags = db
    .prepare(
      `SELECT t.name FROM tags t
       JOIN note_tags nt ON nt.tag_id = t.id
       WHERE nt.note_id = ?`
    )
    .all(row.id as string) as { name: string }[]

  return {
    id: row.id as string,
    title: row.title as string,
    content: row.content as string,
    folderId: row.folder_id as string | null,
    isDeleted: Boolean(row.is_deleted),
    deletedAt: row.deleted_at as number | null,
    pinned: Boolean(row.pinned),
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
    tags: tags.map((t) => t.name)
  }
}

// ─── Folders ───────────────────────────────────────────────────────────────

export function getFolders(): Folder[] {
  const rows = db
    .prepare(`SELECT * FROM folders ORDER BY sort_order ASC, created_at ASC`)
    .all() as Record<string, unknown>[]
  return rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    color: r.color as string,
    icon: r.icon as string,
    sortOrder: r.sort_order as number,
    createdAt: r.created_at as number,
    updatedAt: r.updated_at as number
  }))
}

export function createFolder(name: string, color = '#0071e3', icon = 'folder'): Folder {
  const now = Date.now()
  const id = uuidv4()
  db.prepare(
    `INSERT INTO folders (id, name, color, icon, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, ?, ?)`
  ).run(id, name, color, icon, now, now)
  return { id, name, color, icon, sortOrder: 0, createdAt: now, updatedAt: now }
}

export function updateFolder(id: string, updates: Partial<Folder>): void {
  const now = Date.now()
  const sets: string[] = ['updated_at = ?']
  const values: unknown[] = [now]
  if (updates.name !== undefined) { sets.push('name = ?'); values.push(updates.name) }
  if (updates.color !== undefined) { sets.push('color = ?'); values.push(updates.color) }
  if (updates.icon !== undefined) { sets.push('icon = ?'); values.push(updates.icon) }
  if (updates.sortOrder !== undefined) { sets.push('sort_order = ?'); values.push(updates.sortOrder) }
  values.push(id)
  db.prepare(`UPDATE folders SET ${sets.join(', ')} WHERE id = ?`).run(...values)
}

export function deleteFolder(id: string): void {
  db.prepare(`DELETE FROM folders WHERE id = ?`).run(id)
}

// ─── Notes ─────────────────────────────────────────────────────────────────

export function getNotes(folderId?: string | null): Note[] {
  let rows: Record<string, unknown>[]
  if (folderId === undefined) {
    rows = db
      .prepare(`SELECT * FROM notes WHERE is_deleted = 0 ORDER BY pinned DESC, updated_at DESC`)
      .all() as Record<string, unknown>[]
  } else if (folderId === null) {
    rows = db
      .prepare(
        `SELECT * FROM notes WHERE is_deleted = 0 AND folder_id IS NULL ORDER BY pinned DESC, updated_at DESC`
      )
      .all() as Record<string, unknown>[]
  } else {
    rows = db
      .prepare(
        `SELECT * FROM notes WHERE is_deleted = 0 AND folder_id = ? ORDER BY pinned DESC, updated_at DESC`
      )
      .all(folderId) as Record<string, unknown>[]
  }
  return rows.map(toNote)
}

export function getDeletedNotes(): Note[] {
  const rows = db
    .prepare(`SELECT * FROM notes WHERE is_deleted = 1 ORDER BY deleted_at DESC`)
    .all() as Record<string, unknown>[]
  return rows.map(toNote)
}

export function getNotesByTag(tagName: string): Note[] {
  const rows = db
    .prepare(
      `SELECT n.* FROM notes n
       JOIN note_tags nt ON nt.note_id = n.id
       JOIN tags t ON t.id = nt.tag_id
       WHERE n.is_deleted = 0 AND t.name = ?
       ORDER BY n.pinned DESC, n.updated_at DESC`
    )
    .all(tagName) as Record<string, unknown>[]
  return rows.map(toNote)
}

export function searchNotes(query: string): Note[] {
  const like = `%${query}%`
  const rows = db
    .prepare(
      `SELECT * FROM notes WHERE is_deleted = 0
       AND (title LIKE ? OR content LIKE ?)
       ORDER BY pinned DESC, updated_at DESC`
    )
    .all(like, like) as Record<string, unknown>[]
  return rows.map(toNote)
}

export function createNote(folderId?: string | null): Note {
  const now = Date.now()
  const id = uuidv4()
  db.prepare(
    `INSERT INTO notes (id, title, content, folder_id, is_deleted, created_at, updated_at)
     VALUES (?, '', '', ?, 0, ?, ?)`
  ).run(id, folderId ?? null, now, now)
  return {
    id,
    title: '',
    content: '',
    folderId: folderId ?? null,
    isDeleted: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    tags: []
  }
}

export function updateNote(
  id: string,
  updates: { title?: string; content?: string; folderId?: string | null }
): void {
  const now = Date.now()
  const sets: string[] = ['updated_at = ?']
  const values: unknown[] = [now]
  if (updates.title !== undefined) { sets.push('title = ?'); values.push(updates.title) }
  if (updates.content !== undefined) { sets.push('content = ?'); values.push(updates.content) }
  if ('folderId' in updates) { sets.push('folder_id = ?'); values.push(updates.folderId ?? null) }
  values.push(id)
  db.prepare(`UPDATE notes SET ${sets.join(', ')} WHERE id = ?`).run(...values)
}

export function trashNote(id: string): void {
  const now = Date.now()
  db.prepare(
    `UPDATE notes SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ?`
  ).run(now, now, id)
}

export function restoreNote(id: string): void {
  const now = Date.now()
  db.prepare(
    `UPDATE notes SET is_deleted = 0, deleted_at = NULL, updated_at = ? WHERE id = ?`
  ).run(now, id)
}

export function purgeNote(id: string): void {
  db.prepare(`DELETE FROM notes WHERE id = ?`).run(id)
  pruneUnusedTags()
}

export function emptyTrash(): void {
  db.prepare(`DELETE FROM notes WHERE is_deleted = 1`).run()
  pruneUnusedTags()
}

// ─── Batch operations ─────────────────────────────────────────────────────

export function batchTrashNotes(ids: string[]): void {
  const now = Date.now()
  const stmt = db.prepare(`UPDATE notes SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ?`)
  for (const id of ids) stmt.run(now, now, id)
}

export function batchRestoreNotes(ids: string[]): void {
  const now = Date.now()
  const stmt = db.prepare(`UPDATE notes SET is_deleted = 0, deleted_at = NULL, updated_at = ? WHERE id = ?`)
  for (const id of ids) stmt.run(now, id)
}

export function batchPurgeNotes(ids: string[]): void {
  const stmt = db.prepare(`DELETE FROM notes WHERE id = ?`)
  for (const id of ids) stmt.run(id)
  pruneUnusedTags()
}

// ─── Pin ──────────────────────────────────────────────────────────────────

export function pinNote(id: string, pinned: boolean): void {
  db.prepare(`UPDATE notes SET pinned = ? WHERE id = ?`).run(pinned ? 1 : 0, id)
}

// ─── Tags ──────────────────────────────────────────────────────────────────

export function getTags(): Tag[] {
  const rows = db
    .prepare(`SELECT * FROM tags ORDER BY name ASC`)
    .all() as Record<string, unknown>[]
  return rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    createdAt: r.created_at as number
  }))
}

export function getActiveTags(): Tag[] {
  const rows = db
    .prepare(
      `SELECT t.*, COUNT(DISTINCT n.id) as note_count FROM tags t
       JOIN note_tags nt ON nt.tag_id = t.id
       JOIN notes n ON n.id = nt.note_id
       WHERE n.is_deleted = 0
       GROUP BY t.id
       HAVING note_count > 0
       ORDER BY t.name ASC`
    )
    .all() as Record<string, unknown>[]
  return rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    createdAt: r.created_at as number,
    noteCount: r.note_count as number
  }))
}

function getOrCreateTag(name: string): string {
  const cleaned = name.startsWith('#') ? name.slice(1) : name
  if (!cleaned) return ''
  const existing = db.prepare(`SELECT id FROM tags WHERE name = ?`).get(cleaned) as
    | { id: string }
    | undefined
  if (existing) return existing.id
  const id = uuidv4()
  db.prepare(`INSERT INTO tags (id, name, created_at) VALUES (?, ?, ?)`).run(
    id,
    cleaned,
    Date.now()
  )
  return id
}

export function setNoteTags(noteId: string, tagNames: string[]): void {
  db.prepare(`DELETE FROM note_tags WHERE note_id = ?`).run(noteId)
  for (const name of tagNames) {
    const tagId = getOrCreateTag(name)
    if (tagId) {
      db.prepare(
        `INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)`
      ).run(noteId, tagId)
    }
  }
  pruneUnusedTags()
}

function pruneUnusedTags(): void {
  db.prepare(
    `DELETE FROM tags WHERE id NOT IN (SELECT DISTINCT tag_id FROM note_tags)`
  ).run()
}

// ─── Settings ──────────────────────────────────────────────────────────────

export function getSetting(key: string, defaultValue: string): string {
  const row = db.prepare(`SELECT value FROM app_settings WHERE key = ?`).get(key) as
    | { value: string }
    | undefined
  return row?.value ?? defaultValue
}

export function setSetting(key: string, value: string): void {
  db.prepare(`INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)`).run(key, value)
}

// ─── Export / Import ───────────────────────────────────────────────────────

export function exportData(): ExportData {
  const folders = getFolders()
  const allNotes = db
    .prepare(`SELECT * FROM notes ORDER BY created_at ASC`)
    .all() as Record<string, unknown>[]
  const notes = allNotes.map(toNote)
  const tags = getTags()
  const ntRows = db
    .prepare(
      `SELECT nt.note_id, t.name as tag_name FROM note_tags nt JOIN tags t ON t.id = nt.tag_id`
    )
    .all() as { note_id: string; tag_name: string }[]
  return {
    version: '1.0',
    exportedAt: Date.now(),
    folders,
    notes,
    tags,
    noteTags: ntRows.map((r) => ({ noteId: r.note_id, tagName: r.tag_name }))
  }
}

export function importData(data: ExportData, mode: 'merge' | 'replace'): void {
  if (mode === 'replace') {
    db.exec(`DELETE FROM note_tags; DELETE FROM notes; DELETE FROM tags; DELETE FROM folders;`)
  }

  const insertFolder = db.prepare(
    mode === 'replace'
      ? `INSERT INTO folders (id, name, color, icon, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      : `INSERT OR IGNORE INTO folders (id, name, color, icon, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
  const insertNote = db.prepare(
    `INSERT OR IGNORE INTO notes (id, title, content, folder_id, is_deleted, deleted_at, pinned, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  const insertTag = db.prepare(
    `INSERT OR IGNORE INTO tags (id, name, created_at) VALUES (?, ?, ?)`
  )
  const insertNoteTag = db.prepare(
    `INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)`
  )
  const deleteNoteTagsByNoteId = db.prepare(
    `DELETE FROM note_tags WHERE note_id = ?`
  )
  const findNoteByTitle = db.prepare(
    `SELECT id, content FROM notes WHERE title = ? AND is_deleted = 0 LIMIT 1`
  )

  const checkNoteId = db.prepare(`SELECT id FROM notes WHERE id = ?`)

  const doImport = db.transaction(() => {
    for (const f of data.folders) {
      insertFolder.run(f.id, f.name, f.color, f.icon, f.sortOrder, f.createdAt, f.updatedAt)
    }
    for (const t of data.tags) {
      insertTag.run(t.id, t.name, t.createdAt)
    }

    if (mode === 'replace') {
      for (const n of data.notes) {
        deleteNoteTagsByNoteId.run(n.id)
        insertNote.run(
          n.id, n.title, n.content, n.folderId,
          n.isDeleted ? 1 : 0, n.deletedAt ?? null,
          n.pinned ? 1 : 0,
          n.createdAt, n.updatedAt
        )
      }
    } else {
      // oldNoteId → realNoteId (either new UUID for copies, or existing DB id for same-content sync)
      const idMap = new Map<string, string>()
      // oldNoteIds whose tags were already inserted (new UUID copies); skip in outer tag loop
      const tagsDone = new Set<string>()

      for (const n of data.notes) {
        const existing = findNoteByTitle.get(n.title) as { id: string; content: string } | undefined
        if (existing) {
          if (existing.content === n.content) {
            // Same title & content: keep existing note, sync tags later
            idMap.set(n.id, existing.id)
            continue
          }
          // Same title, different content: create new note with fresh UUID
          const newId = uuidv4()
          idMap.set(n.id, newId)
          tagsDone.add(n.id)
          deleteNoteTagsByNoteId.run(newId)
          insertNote.run(
            newId, n.title, n.content, n.folderId,
            n.isDeleted ? 1 : 0, n.deletedAt ?? null,
            n.pinned ? 1 : 0,
            n.createdAt, n.updatedAt
          )
          for (const nt of data.noteTags) {
            if (nt.noteId !== n.id) continue
            const tag = db.prepare(`SELECT id FROM tags WHERE name = ?`).get(nt.tagName) as
              | { id: string }
              | undefined
            if (tag) insertNoteTag.run(newId, tag.id)
          }
        } else {
          // New title: insert, avoiding UUID collision with existing notes
          let finalId = n.id
          if (checkNoteId.get(n.id)) {
            finalId = uuidv4()
            idMap.set(n.id, finalId)
            tagsDone.add(n.id)
          }
          deleteNoteTagsByNoteId.run(finalId)
          insertNote.run(
            finalId, n.title, n.content, n.folderId,
            n.isDeleted ? 1 : 0, n.deletedAt ?? null,
            n.pinned ? 1 : 0,
            n.createdAt, n.updatedAt
          )
        }
      }

      // Outer tag loop: insert tags for notes that kept their original ID
      for (const nt of data.noteTags) {
        if (tagsDone.has(nt.noteId)) continue
        const tag = db.prepare(`SELECT id FROM tags WHERE name = ?`).get(nt.tagName) as
          | { id: string }
          | undefined
        if (tag) {
          insertNoteTag.run(nt.noteId, tag.id)
        }
      }

      // Sync tags for same-title-same-content notes (their tags may have changed)
      for (const [oldId, realId] of idMap) {
        if (tagsDone.has(oldId)) continue // new-UUID copy, tags already handled
        // Same-content case: wipe old tags and re-insert from import data
        deleteNoteTagsByNoteId.run(realId)
        for (const nt of data.noteTags) {
          if (nt.noteId !== oldId) continue
          const tag = db.prepare(`SELECT id FROM tags WHERE name = ?`).get(nt.tagName) as
            | { id: string }
            | undefined
          if (tag) insertNoteTag.run(realId, tag.id)
        }
      }
    }
  })

  doImport()
}

export function getDbPath(): string {
  return DB_PATH
}
