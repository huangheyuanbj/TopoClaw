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

import { useState, useRef, useEffect } from 'react'
import { toDataURL } from 'qrcode'
import { initApi, getBindingImei } from '../services/api'
import { setImei as saveImei, setServerUrl } from '../services/storage'
import type { FormEvent } from 'react'
import './BindingPage.css'

function generateBindingToken(): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz'
  let s = ''
  const arr = new Uint8Array(12)
  crypto.getRandomValues(arr)
  for (let i = 0; i < 12; i++) s += chars[arr[i] % chars.length]
  return s
}

interface BindingPageProps {
  serverUrl: string
  onBound: () => void
}

export function BindingPage({ serverUrl, onBound }: BindingPageProps) {
  const [mode, setMode] = useState<'choose' | 'input' | 'scan'>('choose')
  const [imeiInput, setImeiInput] = useState('')
  const [error, setError] = useState('')
  const [bindingToken, setBindingToken] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleBindImei = (imei: string) => {
    const trimmed = imei.trim()
    if (!trimmed) {
      setError('请输入 IMEI')
      return
    }
    setError('')
    saveImei(trimmed)
    setServerUrl(serverUrl)
    initApi(serverUrl)
    onBound()
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    handleBindImei(imeiInput)
  }

  // 扫码绑定：PC 生成 token 二维码 cma-bind:{token}，手机扫后上报 IMEI，PC 轮询获取
  useEffect(() => {
    if (mode === 'scan') {
      const token = generateBindingToken()
      setBindingToken(token)
      const qrContent = `cma-bind:${token}`
      toDataURL(qrContent, { width: 260, margin: 2 })
        .then(setQrDataUrl)
        .catch((err: Error) => setError('生成二维码失败: ' + (err?.message || err)))
      initApi(serverUrl)
    }
  }, [mode, serverUrl])

  // 轮询 binding 接口直到获取 IMEI
  useEffect(() => {
    if (mode !== 'scan' || !bindingToken) return
    const POLL_INTERVAL = 1500
    const TIMEOUT = 5 * 60 * 1000
    const start = Date.now()
    let cancelled = false

    const poll = async () => {
      if (cancelled || Date.now() - start > TIMEOUT) return
      const imei = await getBindingImei(bindingToken)
      if (cancelled) return
      if (imei) {
        saveImei(imei)
        setServerUrl(serverUrl)
        initApi(serverUrl)
        onBound()
        return
      }
      setTimeout(poll, POLL_INTERVAL)
    }
    poll()
    return () => { cancelled = true }
  }, [mode, bindingToken, serverUrl, onBound])

  if (mode === 'choose') {
    return (
      <div className="binding-page">
        <div className="binding-card">
          <h1>绑定手机</h1>
          <p className="binding-desc">
            请使用与手机端相同的 IMEI 绑定，以打通聊天记录。
            <br />
            <strong>扫码绑定</strong>：PC 生成二维码，手机端通过「扫一扫」扫描绑定。
            <br />
            <strong>输入 IMEI</strong>：在手机端「我的」→「我的二维码」查看 IMEI 后手动输入。
          </p>
          <div className="binding-actions">
            <button className="btn-primary" onClick={() => setMode('input')}>
              输入 IMEI
            </button>
            <button className="btn-secondary" onClick={() => setMode('scan')}>
              扫码绑定
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (mode === 'scan') {
    return (
      <div className="binding-page">
        <div className="binding-card">
          <h1>扫码绑定</h1>
          <p className="binding-desc">
            请打开手机端「扫一扫」，扫描下方二维码完成绑定
          </p>
          <div className="qr-display">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="绑定二维码" className="qr-image" />
            ) : (
              <canvas ref={canvasRef} className="qr-placeholder" />
            )}
          </div>
          <p className="imei-hint">请使用手机端「扫一扫」扫描二维码，绑定将自动完成</p>
          {error && <p className="error">{error}</p>}
          <div className="form-actions">
            <button className="btn-secondary" onClick={() => setMode('choose')}>
              返回
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="binding-page">
      <div className="binding-card">
        <h1>输入 IMEI</h1>
        <p className="binding-desc">请输入手机端显示的 IMEI（在「我的」→「我的二维码」中查看）</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={imeiInput}
            onChange={(e) => setImeiInput(e.target.value)}
            placeholder="例如: 480b0b29b2c3ff90"
            className="imei-input"
            autoFocus
          />
          {error && <p className="error">{error}</p>}
          <div className="form-actions">
            <button type="submit" className="btn-primary">绑定</button>
            <button type="button" className="btn-secondary" onClick={() => setMode('choose')}>
              返回
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
