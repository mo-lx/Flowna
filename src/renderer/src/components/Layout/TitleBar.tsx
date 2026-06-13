import { useEffect, useState } from 'react'
import { Monitor, Sun, Moon, Download, Upload, Minimize2, Settings, Check } from 'lucide-react'
import { useStore } from '../../store/useStore'

const isMac = window.api?.platform === 'darwin'
const isWin = window.api?.platform === 'win32'

export default function TitleBar() {
  const [isMax, setIsMax] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const { theme, setTheme, exportDb, importDb, enterCompact, autoSaveEnabled, setAutoSaveEnabled } = useStore()

  useEffect(() => {
    window.api?.windowIsMaximized().then(setIsMax)
    const off = window.api?.onWindowMaximized(setIsMax)
    return off
  }, [])

  return (
    <div className={`title-bar ${isWin ? 'title-bar--win' : ''}`}>
      {isMac ? (
        <div style={{ width: 68 }} />
      ) : (
        <div className="title-bar__traffic">
          <button className="traffic-btn traffic-btn--close" onClick={() => window.api?.windowClose()} title="关闭">
            <svg viewBox="0 0 8 8" fill="currentColor"><path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="rgba(0,0,0,0.5)" strokeWidth="1.2" strokeLinecap="round"/></svg>
          </button>
          <button className="traffic-btn traffic-btn--min" onClick={() => window.api?.windowMinimize()} title="最小化">
            <svg viewBox="0 0 8 8" fill="currentColor"><path d="M1 4h6" stroke="rgba(0,0,0,0.5)" strokeWidth="1.2" strokeLinecap="round"/></svg>
          </button>
          <button className="traffic-btn traffic-btn--max" onClick={() => window.api?.windowMaximize()} title={isMax ? '还原' : '最大化'}>
            <svg viewBox="0 0 8 8" fill="currentColor">
              {isMax
                ? <path d="M1.5 3h3v3h-3z M3 1.5h3v3" stroke="rgba(0,0,0,0.5)" strokeWidth="1.1" fill="none"/>
                : <path d="M1.5 1.5h5v5h-5z" stroke="rgba(0,0,0,0.5)" strokeWidth="1.1" fill="none"/>}
            </svg>
          </button>
        </div>
      )}

      <div className="title-bar__center">
        <span style={{ fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Flowna</span>
        <span style={{ marginLeft: 6, color: 'var(--text-tertiary)', fontSize: 12 }}>浮笺</span>
      </div>

      <div className="title-bar__actions">
        {/* Compact mode toggle */}
        <button
          className="win-btn"
          onClick={enterCompact}
          title="浮笺模式（悬浮小窗）"
        >
          <Minimize2 size={14} />
        </button>

        <div style={{ position: 'relative' }}>
          <button
            className="win-btn"
            onClick={() => setShowMenu((v) => !v)}
            title="更多选项"
          >
            <Settings size={14} />
          </button>
          {showMenu && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setShowMenu(false)} />
              <div className="sort-menu" style={{ right: 0, top: 'calc(100% + 6px)', minWidth: 180, zIndex: 200 }}>
                <div className="sort-menu-item" onClick={() => { exportDb(); setShowMenu(false) }}>
                  <Download size={14} /> 导出便签数据
                </div>
                <div className="sort-menu-item" onClick={() => { importDb('merge'); setShowMenu(false) }}>
                  <Upload size={14} /> 导入便签（合并）
                </div>
                <div className="sort-menu-item" onClick={() => { importDb('replace'); setShowMenu(false) }}>
                  <Upload size={14} /> 导入便签（替换）
                </div>
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                <div className="sort-menu-item" onClick={() => { setAutoSaveEnabled(!autoSaveEnabled); setShowMenu(false) }}>
                  {autoSaveEnabled ? <Check size={14} /> : <span style={{ width: 14 }} />}
                  自动保存
                </div>
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                <div className="sort-menu-item" onClick={() => { setTheme('light'); setShowMenu(false) }}>
                  <Sun size={14} /> 浅色模式
                </div>
                <div className="sort-menu-item" onClick={() => { setTheme('dark'); setShowMenu(false) }}>
                  <Moon size={14} /> 深色模式
                </div>
                <div className="sort-menu-item" onClick={() => { setTheme('system'); setShowMenu(false) }}>
                  <Monitor size={14} /> 跟随系统
                </div>
              </div>
            </>
          )}
        </div>

        {isWin && (
          <div className="title-bar__win-controls">
            <button className="win-ctrl-btn" onClick={() => window.api?.windowMinimize()}>
              <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor"/></svg>
            </button>
            <button className="win-ctrl-btn" onClick={() => window.api?.windowMaximize()}>
              {isMax
                ? <svg width="10" height="10" viewBox="0 0 10 10"><rect x="2" y="0" width="8" height="8" stroke="currentColor" strokeWidth="1" fill="none"/><rect x="0" y="2" width="8" height="8" stroke="currentColor" strokeWidth="1" fill="none"/></svg>
                : <svg width="10" height="10" viewBox="0 0 10 10"><rect width="10" height="10" stroke="currentColor" strokeWidth="1" fill="none"/></svg>}
            </button>
            <button className="win-ctrl-btn win-ctrl-btn--close" onClick={() => window.api?.windowClose()}>
              <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
