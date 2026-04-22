// Copyright 2025 OPPO

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//     http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { useCallback, useEffect, useRef, useState } from 'react'
import { copyImageFromSrc } from '../utils/imageClipboard'
import './ChatInlineImage.css'

export type ImageLightboxPayload = { dataUrl: string; fileName?: string }

export function ChatImageLightbox({
  payload,
  onClose,
}: {
  payload: ImageLightboxPayload | null
  onClose: () => void
}) {
  useEffect(() => {
    if (!payload) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [payload, onClose])

  if (!payload) return null

  return (
    <div className="chat-image-lightbox" onClick={onClose} role="presentation">
      <button
        type="button"
        className="chat-image-lightbox-close"
        aria-label="关闭"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
      >
        ×
      </button>
      <div className="chat-image-lightbox-inner" onClick={(e) => e.stopPropagation()}>
        <img src={payload.dataUrl} alt="" className="chat-image-lightbox-img" />
      </div>
      <span className="chat-image-lightbox-hint">点击空白处或按 Esc 关闭 · 右键可复制或另存图片</span>
    </div>
  )
}

interface ChatInlineImageProps {
  dataUrl: string
  fileName?: string
  className?: string
  onOpenLightbox: (payload: ImageLightboxPayload) => void
  /** 在图片右键菜单中提供「记入随手记」 */
  onAddToQuickNote?: () => void
}

export async function saveChatImageToDisk(dataUrl: string, fileName?: string): Promise<void> {
  const api = typeof window !== 'undefined' ? window.electronAPI : undefined
  if (api?.saveImageAs) {
    const r = await api.saveImageAs(dataUrl, fileName || '图片.png')
    if (!r.ok && !r.canceled && r.error) console.warn('[ChatInlineImage] 保存失败:', r.error)
    return
  }
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = fileName || 'image.png'
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export function ChatInlineImage({ dataUrl, fileName, className, onOpenLightbox, onAddToQuickNote }: ChatInlineImageProps) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menu) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return
      setMenu(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(null)
    }
    document.addEventListener('mousedown', onDown, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [menu])

  const openLightbox = useCallback(() => {
    onOpenLightbox({ dataUrl, fileName })
  }, [dataUrl, fileName, onOpenLightbox])

  const handleSaveAs = useCallback(async () => {
    setMenu(null)
    await saveChatImageToDisk(dataUrl, fileName)
  }, [dataUrl, fileName])

  const handleCopy = useCallback(async () => {
    setMenu(null)
    const r = await copyImageFromSrc(dataUrl)
    if (!r.ok && r.error) window.alert(r.error)
  }, [dataUrl])

  if (!dataUrl) return null

  return (
    <>
      <img
        src={dataUrl}
        alt=""
        role="button"
        tabIndex={0}
        className={['chat-image-local-context', className].filter(Boolean).join(' ')}
        title="点击查看大图 · 右键可复制或另存"
        onClick={(e) => {
          e.stopPropagation()
          openLightbox()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            openLightbox()
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setMenu({ x: e.clientX, y: e.clientY })
        }}
      />
      {menu && (
        <div
          ref={menuRef}
          className="chat-image-context-menu"
          style={{ left: menu.x, top: menu.y }}
          role="menu"
        >
          <button type="button" className="chat-image-context-item" role="menuitem" onClick={openLightbox}>
            查看大图
          </button>
          {onAddToQuickNote ? (
            <button
              type="button"
              className="chat-image-context-item"
              role="menuitem"
              onClick={() => {
                setMenu(null)
                onAddToQuickNote()
              }}
            >
              记入随手记
            </button>
          ) : null}
          <button type="button" className="chat-image-context-item" role="menuitem" onClick={() => void handleCopy()}>
            复制图片
          </button>
          <button type="button" className="chat-image-context-item" role="menuitem" onClick={handleSaveAs}>
            图片另存为…
          </button>
        </div>
      )}
    </>
  )
}
