import { app, BrowserWindow, shell, ipcMain } from 'electron'
import path from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDb } from './db'
import { registerIpcHandlers } from './ipc-handlers'

let mainWindow: BrowserWindow | null = null

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 800,
    minHeight: 520,
    show: false,
    frame: false,
    // transparent enables glassmorphism in compact mode;
    // main mode uses a solid CSS background so no visual difference.
    transparent: true,
    hasShadow: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Disable DevTools in production to protect source code
  if (!is.dev) {
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow?.webContents.closeDevTools()
    })
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:maximized', true)
  })
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:maximized', false)
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

// ─── Single instance lock ──────────────────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

// ─── Compact mode ──────────────────────────────────────────────────────────
const COMPACT_W = 380
const COMPACT_H = 600
const COMPACT_MIN_W = 260
const COMPACT_MIN_H = 320
const COMPACT_MAX_W = 560
const COMPACT_MAX_H = 820

ipcMain.on('compact:enter', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return
  win.setMinimumSize(COMPACT_MIN_W, COMPACT_MIN_H)
  win.setMaximumSize(COMPACT_MAX_W, COMPACT_MAX_H)
  win.setSize(COMPACT_W, COMPACT_H, true)
  win.setAlwaysOnTop(true)
  // Keep shadow for the rounded compact window
  win.setHasShadow(true)
})

ipcMain.on('compact:exit', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return
  win.setAlwaysOnTop(false)
  win.setMinimumSize(800, 520)
  win.setMaximumSize(0, 0)
  win.setSize(1200, 780, true)
})

ipcMain.on('compact:set-pin', (event, pinned: boolean) => {
  BrowserWindow.fromWebContents(event.sender)?.setAlwaysOnTop(pinned)
})

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.flowna.app')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  initDb()
  registerIpcHandlers()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
    else mainWindow?.show()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
