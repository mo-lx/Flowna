import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'

const COLORS = [
  '#0071e3', '#34c759', '#ff9500', '#ff3b30',
  '#af52de', '#ff2d55', '#5ac8fa', '#ffcc00',
  '#636366', '#1d1d1f'
]

export default function FolderModal() {
  const { editingFolder, createFolder, updateFolder, closeFolderModal } = useStore()
  const isEdit = Boolean(editingFolder)

  const [name, setName] = useState(editingFolder?.name ?? '')
  const [color, setColor] = useState(editingFolder?.color ?? COLORS[0])

  useEffect(() => {
    setName(editingFolder?.name ?? '')
    setColor(editingFolder?.color ?? COLORS[0])
  }, [editingFolder])

  const handleSubmit = async () => {
    if (!name.trim()) return
    if (isEdit && editingFolder) {
      await updateFolder(editingFolder.id, { name: name.trim(), color })
    } else {
      await createFolder(name.trim(), color)
    }
    closeFolderModal()
  }

  return (
    <div className="modal-overlay" onClick={closeFolderModal}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__title">{isEdit ? '编辑文件夹' : '新建文件夹'}</div>

        <div className="modal__field">
          <label className="modal__label">名称</label>
          <input
            className="modal__input"
            placeholder="文件夹名称…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
            autoFocus
          />
        </div>

        <div className="modal__field">
          <label className="modal__label">颜色</label>
          <div className="color-palette">
            {COLORS.map((c) => (
              <div
                key={c}
                className={`color-swatch ${color === c ? 'color-swatch--selected' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>预览：</span>
          <span style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 13, color: 'var(--text-primary)'
          }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
            {name || '文件夹名称'}
          </span>
        </div>

        <div className="modal__footer">
          <button className="btn btn--ghost" onClick={closeFolderModal}>取消</button>
          <button
            className="btn btn--primary"
            onClick={handleSubmit}
            disabled={!name.trim()}
          >
            {isEdit ? '保存' : '创建'}
          </button>
        </div>
      </div>
    </div>
  )
}
