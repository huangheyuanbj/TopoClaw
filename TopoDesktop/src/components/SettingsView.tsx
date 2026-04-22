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

import { useState, useEffect, useRef } from 'react'
import { toDataURL } from 'qrcode'
import {
  DEFAULT_CHAT_ASSISTANT_URL,
  DEFAULT_CUSTOMER_SERVICE_URL,
  DEFAULT_SERVER_URL,
  DEFAULT_SKILL_COMMUNITY_URL,
  getAutoExecuteCode,
  getChatAssistantUrl,
  getCustomerServiceUrl,
  getImei,
  getServerUrl,
  getSkillCommunityUrl,
  setAutoExecuteCode,
  setChatAssistantUrl,
  setCustomerServiceUrl,
  setServerUrl,
  setSkillCommunityUrl,
} from '../services/storage'
import { adaptAssistantIdsForUser, getCustomAssistantsFromCloud, getUserSettings, initApi, updateUserSettings } from '../services/api'
import { clearAllChatMessages } from '../services/messageStorage'
import { probeDesktopUpdate, type DesktopUpdatePayload } from '../services/desktopVersionCheck'
import { mergeCloudAssistantsAndEnsureDefaultTopo } from '../services/customAssistants'
import {
  getBuiltinAssistantConfig,
  getBuiltinServicesEnabled,
  getBuiltinAssistantLogBuffer,
  getDefaultBuiltinUrls,
  getWeixinLoginQr,
  pollWeixinLoginStatus,
  setBuiltinServicesEnabled,
  saveBuiltinAssistantConfig,
  restartBuiltinAssistant,
  syncTopomobileWsUrlFromCustomerServiceUrl,
} from '../services/builtinAssistantConfig'
import { NewAssistantModal } from './NewAssistantModal'
import { DeveloperView } from './DeveloperView'
import { DesktopUpdateDialog } from './DesktopUpdateDialog'
import './SettingsView.css'

interface SettingsViewProps {
  onLogout?: () => void
  onClearChatHistory?: () => void
  onNewAssistantSaved?: () => void
}

export function SettingsView({ onLogout, onClearChatHistory, onNewAssistantSaved }: SettingsViewProps) {
  const WEIXIN_DEFAULT_BASE_URL = 'https://ilinkai.weixin.qq.com'
  const [showNewAssistant, setShowNewAssistant] = useState(false)
  const [showDeveloper, setShowDeveloper] = useState(false)
  const [autoExecuteCode, setAutoExecuteCodeState] = useState(getAutoExecuteCode())
  const [appVersion, setAppVersion] = useState<string>('—')
  const [desktopUpdate, setDesktopUpdate] = useState<DesktopUpdatePayload | null>(null)
  const [versionCheckHint, setVersionCheckHint] = useState<string | null>(null)
  const [versionCheckBusy, setVersionCheckBusy] = useState(false)
  const [showQqModal, setShowQqModal] = useState(false)
  const [qqAppId, setQqAppId] = useState('')
  const [qqAppSecret, setQqAppSecret] = useState('')
  const [qqAllowFrom, setQqAllowFrom] = useState('*')
  const [qqSaving, setQqSaving] = useState(false)
  const [qqTesting, setQqTesting] = useState(false)
  const [qqError, setQqError] = useState('')
  const [qqSuccess, setQqSuccess] = useState('')
  const [showWeixinModal, setShowWeixinModal] = useState(false)
  const [weixinBotToken, setWeixinBotToken] = useState('')
  const [weixinBaseUrl, setWeixinBaseUrl] = useState('https://ilinkai.weixin.qq.com')
  const [weixinAllowFrom, setWeixinAllowFrom] = useState('*')
  const [weixinSaving, setWeixinSaving] = useState(false)
  const [weixinTesting, setWeixinTesting] = useState(false)
  const [weixinError, setWeixinError] = useState('')
  const [weixinSuccess, setWeixinSuccess] = useState('')
  const [weixinQrDataUrl, setWeixinQrDataUrl] = useState('')
  const [weixinQrHint, setWeixinQrHint] = useState('')
  const [weixinQrLoading, setWeixinQrLoading] = useState(false)
  const [builtinDefaultUrls, setBuiltinDefaultUrls] = useState<{ topoclaw: string; groupmanager: string } | null>(null)
  const [builtinDefaultIp, setBuiltinDefaultIp] = useState<string>('—')
  const [builtinUrlLoading, setBuiltinUrlLoading] = useState(false)
  const [builtinUrlHint, setBuiltinUrlHint] = useState<string | null>(null)
  const [customerServiceSyncHint, setCustomerServiceSyncHint] = useState<string | null>(null)
  const [showOpenSourceNotice, setShowOpenSourceNotice] = useState(false)
  const [openSourceNoticeText, setOpenSourceNoticeText] = useState('')
  const [openSourceNoticeLoading, setOpenSourceNoticeLoading] = useState(false)
  const [openSourceNoticeError, setOpenSourceNoticeError] = useState<string | null>(null)
  const [adaptAssistantIdsBusy, setAdaptAssistantIdsBusy] = useState(false)
  const [digitalCloneEnabled, setDigitalCloneEnabled] = useState(false)
  const [digitalCloneLoading, setDigitalCloneLoading] = useState(false)
  const [builtinServicesEnabled, setBuiltinServicesEnabledState] = useState(true)
  const [builtinServicesSaving, setBuiltinServicesSaving] = useState(false)
  const [builtinServicesHint, setBuiltinServicesHint] = useState('')
  const imei = getImei()
  const serverUrl = getServerUrl()
  const customerServiceUrl = getCustomerServiceUrl()
  const chatAssistantUrl = getChatAssistantUrl()
  const skillCommunityUrl = getSkillCommunityUrl()
  const weixinPollLoopIdRef = useRef(0)
  const weixinModalOpenRef = useRef(false)

  useEffect(() => {
    void (async () => {
      try {
        const v = await window.electronAPI?.getAppVersion?.()
        if (typeof v === 'string' && v.trim()) setAppVersion(v.trim())
        else setAppVersion('0.0.0')
      } catch {
        setAppVersion('0.0.0')
      }
    })()
  }, [])

  const refreshBuiltinDefaultUrls = () => {
    setBuiltinUrlLoading(true)
    setBuiltinUrlHint(null)
    void getDefaultBuiltinUrls()
      .then((urls) => {
        setBuiltinDefaultUrls(urls)
        try {
          const host = new URL(urls.topoclaw).hostname || '—'
          setBuiltinDefaultIp(host)
        } catch {
          setBuiltinDefaultIp('—')
        }
      })
      .catch(() => {
        setBuiltinUrlHint('读取失败，请重试')
        setBuiltinDefaultIp('—')
      })
      .finally(() => setBuiltinUrlLoading(false))
  }

  useEffect(() => {
    refreshBuiltinDefaultUrls()
  }, [])

  useEffect(() => {
    let cancelled = false
    const loadDigitalCloneSetting = async () => {
      if (!imei) {
        setDigitalCloneEnabled(false)
        return
      }
      setDigitalCloneLoading(true)
      try {
        const res = await getUserSettings(imei)
        if (cancelled || !res.success) return
        setDigitalCloneEnabled(res.settings?.digital_clone_enabled === true)
      } finally {
        if (!cancelled) setDigitalCloneLoading(false)
      }
    }
    void loadDigitalCloneSetting()
    return () => {
      cancelled = true
    }
  }, [imei])

  useEffect(() => {
    let cancelled = false
    void getBuiltinServicesEnabled()
      .then((enabled) => {
        if (!cancelled) setBuiltinServicesEnabledState(enabled)
      })
      .catch(() => {
        if (!cancelled) setBuiltinServicesEnabledState(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    weixinModalOpenRef.current = showWeixinModal
    if (!showWeixinModal) {
      weixinPollLoopIdRef.current += 1
    }
  }, [showWeixinModal])

  const reinitApiClients = () => {
    initApi(getServerUrl(), getCustomerServiceUrl())
  }

  const handleAutoExecuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.checked
    setAutoExecuteCodeState(v)
    setAutoExecuteCode(v)
  }

  const handleDigitalCloneChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.checked
    if (!imei) {
      setDigitalCloneEnabled(false)
      return
    }
    setDigitalCloneEnabled(v)
    setDigitalCloneLoading(true)
    try {
      const res = await updateUserSettings(imei, { digital_clone_enabled: v })
      if (res.success) {
        setDigitalCloneEnabled(res.settings?.digital_clone_enabled === true)
      }
    } finally {
      setDigitalCloneLoading(false)
    }
  }

  const handleBuiltinServicesToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextEnabled = e.target.checked
    const prevEnabled = builtinServicesEnabled
    setBuiltinServicesEnabledState(nextEnabled)
    setBuiltinServicesSaving(true)
    setBuiltinServicesHint('')
    try {
      const res = await setBuiltinServicesEnabled(nextEnabled)
      if (!res.ok) {
        setBuiltinServicesEnabledState(prevEnabled)
        setBuiltinServicesHint(res.error || '保存失败，请重试')
        return
      }
      setBuiltinServicesEnabledState(res.enabled !== false)
      setBuiltinServicesHint(
        res.enabled
          ? '已开启：可启动 TopoClaw / GroupManager 与内置终端。'
          : '已关闭：所有内置服务和内置终端已停止并禁用。'
      )
    } finally {
      setBuiltinServicesSaving(false)
    }
  }

  const handleClearChatHistory = () => {
    if (!window.confirm('确定要清空所有聊天记录吗？此操作仅清除 PC 端本地数据，无法撤销。')) return
    clearAllChatMessages()
    onClearChatHistory?.()
  }

  const handleServerChange = (e: React.FocusEvent<HTMLInputElement>) => {
    const v = e.target.value.trim()
    setServerUrl(v || DEFAULT_SERVER_URL)
    reinitApiClients()
  }

  const handleCustomerServiceChange = async (e: React.FocusEvent<HTMLInputElement>) => {
    const v = e.target.value.trim()
    const nextUrl = v || DEFAULT_CUSTOMER_SERVICE_URL
    setCustomerServiceUrl(nextUrl)
    reinitApiClients()
    setCustomerServiceSyncHint(null)
    const syncRes = await syncTopomobileWsUrlFromCustomerServiceUrl(nextUrl)
    if (!syncRes.ok) {
      setCustomerServiceSyncHint(`已保存 v4 地址，但 TopoMobile 通道同步失败：${syncRes.error || '未知错误'}`)
    }
  }

  const handleChatAssistantChange = (e: React.FocusEvent<HTMLInputElement>) => {
    const v = e.target.value.trim()
    setChatAssistantUrl(v || DEFAULT_CHAT_ASSISTANT_URL)
  }

  const handleSkillCommunityChange = (e: React.FocusEvent<HTMLInputElement>) => {
    const v = e.target.value.trim()
    setSkillCommunityUrl(v || DEFAULT_SKILL_COMMUNITY_URL)
  }

  const handleLogout = () => onLogout?.()

  const handleAdaptAssistantIds = async () => {
    if (!imei) {
      window.alert('请先绑定手机设备')
      return
    }
    setAdaptAssistantIdsBusy(true)
    try {
      const res = await adaptAssistantIdsForUser(imei)
      if (!res.success) {
        window.alert(`适配失败：${res.message || '未知错误'}`)
        return
      }
      // 适配完成后立刻从云侧回拉并覆盖本地，避免页面继续展示旧 id/displayId。
      try {
        const cloudAssistants = await getCustomAssistantsFromCloud(imei, Date.now(), { timeoutMs: 12000, throwOnError: true })
        await mergeCloudAssistantsAndEnsureDefaultTopo(cloudAssistants, imei)
        onNewAssistantSaved?.()
      } catch {
        // 云侧刷新失败不影响适配主流程提示
      }
      const a = res.assistant_stats
      const g = res.group_stats
      window.alert(
        `适配完成\n助手：${a?.assistants_updated ?? 0}/${a?.assistants_total ?? 0}\n群组：${g?.groups_updated ?? 0}/${g?.groups_total ?? 0}\n群配置更新：${g?.configs_updated ?? 0}`
      )
    } finally {
      setAdaptAssistantIdsBusy(false)
    }
  }

  const openQqConfigModal = async () => {
    setQqError('')
    setQqSuccess('')
    setShowQqModal(true)
    try {
      const cfg = await getBuiltinAssistantConfig()
      setQqAppId(cfg.qqAppId || '')
      setQqAppSecret(cfg.qqAppSecret || '')
      setQqAllowFrom((cfg.qqAllowFrom || '*').trim() || '*')
    } catch {
      setQqAppId('')
      setQqAppSecret('')
      setQqAllowFrom('*')
    }
  }

  const handleSaveQqConfig = async () => {
    const appId = qqAppId.trim()
    const appSecret = qqAppSecret.trim()
    const allowFrom = qqAllowFrom.trim() || '*'
    if (!appId) {
      setQqError('请填写 QQ AppID')
      return
    }
    if (!appSecret) {
      setQqError('请填写 QQ AppSecret')
      return
    }

    setQqSaving(true)
    setQqError('')
    setQqSuccess('')
    try {
      const saveRes = await saveBuiltinAssistantConfig({
        qqEnabled: true,
        qqAppId: appId,
        qqAppSecret: appSecret,
        qqAllowFrom: allowFrom,
      })
      if (!saveRes.ok) {
        setQqError(saveRes.error || '保存配置失败')
        return
      }
      const restartRes = await restartBuiltinAssistant('topoclaw')
      if (!restartRes.ok) {
        setQqError(`配置已保存，但重启内置服务失败：${restartRes.error || '未知错误'}`)
        return
      }
      setQqSuccess('QQ 通道已启用，内置服务重启成功。现在可在 QQ 私聊或群里 @机器人 使用。')
    } finally {
      setQqSaving(false)
    }
  }

  const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

  const handleTestQqConfig = async () => {
    const appId = qqAppId.trim()
    const appSecret = qqAppSecret.trim()
    const allowFrom = qqAllowFrom.trim() || '*'
    if (!appId) {
      setQqError('请填写 QQ AppID')
      return
    }
    if (!appSecret) {
      setQqError('请填写 QQ AppSecret')
      return
    }

    setQqTesting(true)
    setQqError('')
    setQqSuccess('正在测试连接，请稍候…')
    try {
      const before = await getBuiltinAssistantLogBuffer('topoclaw')
      const saveRes = await saveBuiltinAssistantConfig({
        qqEnabled: true,
        qqAppId: appId,
        qqAppSecret: appSecret,
        qqAllowFrom: allowFrom,
      })
      if (!saveRes.ok) {
        setQqError(saveRes.error || '保存测试配置失败')
        setQqSuccess('')
        return
      }
      const restartRes = await restartBuiltinAssistant('topoclaw')
      if (!restartRes.ok) {
        setQqError(`测试失败：内置服务重启失败（${restartRes.error || '未知错误'}）`)
        setQqSuccess('')
        return
      }

      const beforeLen = before.length
      let delta = ''
      for (let i = 0; i < 8; i += 1) {
        await sleep(1000)
        const after = await getBuiltinAssistantLogBuffer('topoclaw')
        delta = after.slice(Math.min(beforeLen, after.length))
        const text = delta.toLowerCase()
        if (text.includes('qq bot ready') || text.includes('qq channel enabled')) {
          setQqSuccess('测试成功：QQ 通道连接正常。你现在可以在 QQ 里直接发消息进行验证。')
          setQqError('')
          return
        }
        if (
          text.includes('qq sdk not installed') ||
          text.includes('qq app_id and secret not configured') ||
          text.includes('qq bot error') ||
          text.includes('failed to start channel qq')
        ) {
          setQqError('测试失败：请检查 AppID / AppSecret 是否正确，并确认网络可访问 QQ 平台。')
          setQqSuccess('')
          return
        }
      }

      setQqError('测试超时：未在日志中检测到明确成功信号，请打开日志进一步排查。')
      setQqSuccess('')
    } finally {
      setQqTesting(false)
    }
  }

  const openWeixinConfigModal = async () => {
    setWeixinError('')
    setWeixinSuccess('')
    setWeixinQrHint('')
    setWeixinQrDataUrl('')
    setShowWeixinModal(true)
    try {
      const cfg = await getBuiltinAssistantConfig()
      setWeixinBotToken(cfg.weixinBotToken || '')
      const nextBaseUrl = (cfg.weixinBaseUrl || WEIXIN_DEFAULT_BASE_URL).trim() || WEIXIN_DEFAULT_BASE_URL
      setWeixinBaseUrl(nextBaseUrl)
      setWeixinAllowFrom((cfg.weixinAllowFrom || '*').trim() || '*')
      void startWeixinQrLogin(nextBaseUrl)
    } catch {
      setWeixinBotToken('')
      setWeixinBaseUrl(WEIXIN_DEFAULT_BASE_URL)
      setWeixinAllowFrom('*')
      void startWeixinQrLogin(WEIXIN_DEFAULT_BASE_URL)
    }
  }

  const startWeixinQrLogin = async (baseUrlRaw?: string) => {
    const baseUrl = (baseUrlRaw || weixinBaseUrl || WEIXIN_DEFAULT_BASE_URL).trim() || WEIXIN_DEFAULT_BASE_URL
    setWeixinQrLoading(true)
    setWeixinQrHint('正在获取微信登录二维码…')
    setWeixinError('')
    const loopId = Date.now()
    weixinPollLoopIdRef.current = loopId
    try {
      const qrRes = await getWeixinLoginQr({ baseUrl })
      if (!qrRes.ok) {
        setWeixinError(qrRes.error || '获取二维码失败')
        setWeixinQrHint('')
        return
      }
      const qrData = await toDataURL(qrRes.payload, { width: 260, margin: 1 })
      setWeixinQrDataUrl(qrData)
      setWeixinQrHint('请使用微信扫一扫，扫描二维码完成绑定')
      void pollWeixinQrLoop(loopId, qrRes.baseUrl || baseUrl, qrRes.qrcodeTicket)
    } catch (e) {
      setWeixinError(`获取二维码失败：${String(e)}`)
      setWeixinQrHint('')
    } finally {
      setWeixinQrLoading(false)
    }
  }

  const pollWeixinQrLoop = async (loopId: number, baseUrl: string, qrcodeTicket: string) => {
    while (weixinModalOpenRef.current && weixinPollLoopIdRef.current === loopId) {
      const statusRes = await pollWeixinLoginStatus({ baseUrl, qrcodeTicket })
      if (!statusRes.ok) {
        setWeixinQrHint(statusRes.error || '查询扫码状态失败')
        await sleep(1500)
        continue
      }
      const status = (statusRes.status || '').toLowerCase()
      if (status === 'scaned') {
        setWeixinQrHint('已扫码，请在微信中确认授权…')
      } else if (status === 'expired') {
        setWeixinQrHint('二维码已过期，正在刷新…')
        if (weixinPollLoopIdRef.current === loopId) {
          void startWeixinQrLogin(baseUrl)
        }
        return
      } else if (status === 'confirmed') {
        const botToken = (statusRes.botToken || '').trim()
        const finalBaseUrl = (statusRes.baseUrl || baseUrl || WEIXIN_DEFAULT_BASE_URL).trim() || WEIXIN_DEFAULT_BASE_URL
        if (!botToken) {
          setWeixinError('扫码已确认，但未获取到 botToken，请重试')
          return
        }
        setWeixinQrHint('扫码成功，正在保存配置并重启服务…')
        const saveRes = await saveBuiltinAssistantConfig({
          weixinEnabled: true,
          weixinBotToken: botToken,
          weixinBaseUrl: finalBaseUrl,
          weixinAllowFrom: weixinAllowFrom.trim() || '*',
        })
        if (!saveRes.ok) {
          setWeixinError(saveRes.error || '保存微信配置失败')
          return
        }
        setWeixinBotToken(botToken)
        setWeixinBaseUrl(finalBaseUrl)
        const restartRes = await restartBuiltinAssistant('topoclaw')
        if (!restartRes.ok) {
          setWeixinError(`扫码成功，但重启内置服务失败：${restartRes.error || '未知错误'}`)
          return
        }
        setWeixinSuccess('扫码绑定成功，微信通道已启用。')
        setWeixinError('')
        setWeixinQrHint('已绑定成功')
        return
      }
      await sleep(1200)
    }
  }

  const handleSaveWeixinConfig = async () => {
    const botToken = weixinBotToken.trim()
    const baseUrl = weixinBaseUrl.trim() || WEIXIN_DEFAULT_BASE_URL
    const allowFrom = weixinAllowFrom.trim() || '*'

    setWeixinSaving(true)
    setWeixinError('')
    setWeixinSuccess('')
    try {
      const saveRes = await saveBuiltinAssistantConfig({
        weixinEnabled: true,
        weixinBotToken: botToken,
        weixinBaseUrl: baseUrl,
        weixinAllowFrom: allowFrom,
      })
      if (!saveRes.ok) {
        setWeixinError(saveRes.error || '保存配置失败')
        return
      }
      const restartRes = await restartBuiltinAssistant('topoclaw')
      if (!restartRes.ok) {
        setWeixinError(`配置已保存，但重启内置服务失败：${restartRes.error || '未知错误'}`)
        return
      }
      if (!botToken) {
        setWeixinSuccess('微信配置已保存。因未填写 botToken，服务重启后会进入扫码绑定流程，请在日志中查看二维码并用微信确认。')
        return
      }
      setWeixinSuccess('微信通道已启用，内置服务重启成功。你现在可以在微信侧发消息验证。')
    } finally {
      setWeixinSaving(false)
    }
  }

  const handleTestWeixinConfig = async () => {
    const botToken = weixinBotToken.trim()
    const baseUrl = weixinBaseUrl.trim() || WEIXIN_DEFAULT_BASE_URL
    const allowFrom = weixinAllowFrom.trim() || '*'

    setWeixinTesting(true)
    setWeixinError('')
    setWeixinSuccess('正在测试连接，请稍候…')
    try {
      const before = await getBuiltinAssistantLogBuffer('topoclaw')
      const saveRes = await saveBuiltinAssistantConfig({
        weixinEnabled: true,
        weixinBotToken: botToken,
        weixinBaseUrl: baseUrl,
        weixinAllowFrom: allowFrom,
      })
      if (!saveRes.ok) {
        setWeixinError(saveRes.error || '保存测试配置失败')
        setWeixinSuccess('')
        return
      }
      const restartRes = await restartBuiltinAssistant('topoclaw')
      if (!restartRes.ok) {
        setWeixinError(`测试失败：内置服务重启失败（${restartRes.error || '未知错误'}）`)
        setWeixinSuccess('')
        return
      }

      const beforeLen = before.length
      let delta = ''
      for (let i = 0; i < 10; i += 1) {
        await sleep(1000)
        const after = await getBuiltinAssistantLogBuffer('topoclaw')
        delta = after.slice(Math.min(beforeLen, after.length))
        const text = delta.toLowerCase()
        if (text.includes('weixin channel enabled') || text.includes('weixin monitor started')) {
          setWeixinSuccess('测试成功：微信通道已启动。你现在可以在微信侧发消息进行验证。')
          setWeixinError('')
          return
        }
        if (
          text.includes('请使用微信扫描') ||
          text.includes('weixin (ilink): 正在获取登录二维码') ||
          text.includes('已扫码，请在微信上确认登录')
        ) {
          setWeixinSuccess('测试中：已进入微信扫码绑定流程，请在日志二维码完成确认后再重试发送消息。')
          setWeixinError('')
          return
        }
        if (
          text.includes('微信扫码登录失败') ||
          text.includes('微信登录超时') ||
          text.includes('failed to start channel weixin') ||
          text.includes('weixin: base_url missing')
        ) {
          setWeixinError('测试失败：请检查 Base URL、网络连通性，或重新扫码绑定获取 botToken。')
          setWeixinSuccess('')
          return
        }
      }

      setWeixinError('测试超时：未检测到明确成功信号，请打开日志进一步排查。')
      setWeixinSuccess('')
    } finally {
      setWeixinTesting(false)
    }
  }

  const handleCheckDesktopUpdate = () => {
    setVersionCheckHint(null)
    setVersionCheckBusy(true)
    reinitApiClients()
    void probeDesktopUpdate()
      .then((p) => {
        if (p) setDesktopUpdate(p)
        else setVersionCheckHint('当前已是最新版本')
      })
      .catch(() => setVersionCheckHint('检查失败，请确认服务器地址与网络'))
      .finally(() => setVersionCheckBusy(false))
  }

  const openOpenSourceNotice = () => {
    setShowOpenSourceNotice(true)
    if (openSourceNoticeText || openSourceNoticeLoading) return
    setOpenSourceNoticeLoading(true)
    setOpenSourceNoticeError(null)
    void fetch('./THIRD_PARTY_LICENSES.md')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.text()
      })
      .then((text) => {
        setOpenSourceNoticeText(text)
      })
      .catch((e) => {
        setOpenSourceNoticeError(`读取开源声明失败：${String(e)}。请先执行 npm run licenses:generate 后重新打包。`)
      })
      .finally(() => setOpenSourceNoticeLoading(false))
  }

  return (
    <div className="settings-view">
      {desktopUpdate && (
        <DesktopUpdateDialog
          open
          forceUpdate={desktopUpdate.forceUpdate}
          currentVersion={desktopUpdate.currentVersion}
          latestVersion={desktopUpdate.latestVersion}
          message={desktopUpdate.updateMessage}
          updateUrl={desktopUpdate.updateUrl}
          onDismiss={() => setDesktopUpdate(null)}
        />
      )}
      {showNewAssistant && (
        <NewAssistantModal
          onClose={() => setShowNewAssistant(false)}
          onSaved={() => onNewAssistantSaved?.()}
        />
      )}
      {showDeveloper && (
        <div className="settings-developer-overlay">
          <div className="settings-developer-modal">
            <div className="settings-developer-header">
              <h3>开发者选项</h3>
              <button
                type="button"
                className="settings-developer-close"
                onClick={() => setShowDeveloper(false)}
              >
                ×
              </button>
            </div>
            <div className="settings-developer-body">
              <DeveloperView hideHeader />
            </div>
          </div>
        </div>
      )}
      {showQqModal && (
        <div className="settings-developer-overlay" onClick={() => !qqSaving && !qqTesting && setShowQqModal(false)}>
          <div className="settings-developer-modal settings-qq-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-developer-header">
              <h3>注册 QQ 通道</h3>
              <button
                type="button"
                className="settings-developer-close"
                onClick={() => setShowQqModal(false)}
                disabled={qqSaving || qqTesting}
              >
                ×
              </button>
            </div>
            <div className="settings-developer-body settings-qq-body">
              <p className="settings-version-hint">
                输入你在 QQ 机器人平台申请的 AppID 和 AppSecret。保存后会自动重启内置 TopoClaw 服务。
              </p>
              <div className="settings-group">
                <label>QQ AppID</label>
                <input
                  type="text"
                  className="settings-input"
                  value={qqAppId}
                  onChange={(e) => setQqAppId(e.target.value)}
                  placeholder="如：1903678999"
                />
              </div>
              <div className="settings-group">
                <label>QQ AppSecret</label>
                <input
                  type="password"
                  className="settings-input"
                  value={qqAppSecret}
                  onChange={(e) => setQqAppSecret(e.target.value)}
                  placeholder="请输入 AppSecret"
                />
              </div>
              <div className="settings-group">
                <label>Allow From（可选，逗号分隔，默认 *）</label>
                <input
                  type="text"
                  className="settings-input"
                  value={qqAllowFrom}
                  onChange={(e) => setQqAllowFrom(e.target.value)}
                  placeholder="* 或 user_openid_1,user_openid_2"
                />
              </div>
              {qqError && <div className="settings-error">{qqError}</div>}
              {qqSuccess && <div className="settings-success">{qqSuccess}</div>}
              <div className="settings-actions">
                <button
                  type="button"
                  className="settings-btn settings-btn-secondary"
                  onClick={() => setShowQqModal(false)}
                  disabled={qqSaving || qqTesting}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="settings-btn settings-btn-secondary"
                  onClick={() => void handleTestQqConfig()}
                  disabled={qqSaving || qqTesting}
                >
                  {qqTesting ? '测试中…' : '测试连接'}
                </button>
                <button
                  type="button"
                  className="settings-btn settings-btn-primary"
                  onClick={handleSaveQqConfig}
                  disabled={qqSaving || qqTesting}
                >
                  {qqSaving ? '保存中…' : '保存并启用'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showWeixinModal && (
        <div
          className="settings-developer-overlay"
          onClick={() => !weixinSaving && !weixinTesting && setShowWeixinModal(false)}
        >
          <div className="settings-developer-modal settings-qq-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-developer-header">
              <h3>注册微信通道</h3>
              <button
                type="button"
                className="settings-developer-close"
                  onClick={() => setShowWeixinModal(false)}
                disabled={weixinSaving || weixinTesting}
              >
                ×
              </button>
            </div>
            <div className="settings-developer-body settings-qq-body">
              <p className="settings-version-hint">
                可直接填写 botToken，或留空后保存并重启以触发扫码绑定。保存后会自动重启内置 TopoClaw 服务。
              </p>
              <div className="settings-group">
                <label>微信 BotToken（可选）</label>
                <input
                  type="password"
                  className="settings-input"
                  value={weixinBotToken}
                  onChange={(e) => setWeixinBotToken(e.target.value)}
                  placeholder="留空则重启后走扫码绑定"
                />
              </div>
              <div className="settings-group">
                <label>微信 Base URL</label>
                <input
                  type="text"
                  className="settings-input"
                  value={weixinBaseUrl}
                  onChange={(e) => setWeixinBaseUrl(e.target.value)}
                  placeholder={WEIXIN_DEFAULT_BASE_URL}
                />
              </div>
              <div className="settings-group">
                <label>微信登录二维码</label>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  {weixinQrDataUrl ? (
                    <img src={weixinQrDataUrl} alt="微信登录二维码" style={{ width: 180, height: 180, borderRadius: 8, border: '1px solid #eee' }} />
                  ) : (
                    <div
                      style={{
                        width: 180,
                        height: 180,
                        borderRadius: 8,
                        border: '1px dashed #ccc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#999',
                        fontSize: 12,
                      }}
                    >
                      {weixinQrLoading ? '加载中…' : '暂无二维码'}
                    </div>
                  )}
                  <button
                    type="button"
                    className="settings-btn settings-btn-secondary"
                    onClick={() => void startWeixinQrLogin()}
                    disabled={weixinQrLoading || weixinSaving || weixinTesting}
                  >
                    {weixinQrLoading ? '获取中…' : '刷新二维码'}
                  </button>
                </div>
                {weixinQrHint && <div className="settings-version-hint">{weixinQrHint}</div>}
              </div>
              <div className="settings-group">
                <label>Allow From（可选，逗号分隔，默认 *）</label>
                <input
                  type="text"
                  className="settings-input"
                  value={weixinAllowFrom}
                  onChange={(e) => setWeixinAllowFrom(e.target.value)}
                  placeholder="* 或 user_id_1,user_id_2"
                />
              </div>
              {weixinError && <div className="settings-error">{weixinError}</div>}
              {weixinSuccess && <div className="settings-success">{weixinSuccess}</div>}
              <div className="settings-actions">
                <button
                  type="button"
                  className="settings-btn settings-btn-secondary"
                  onClick={() => setShowWeixinModal(false)}
                  disabled={weixinSaving || weixinTesting}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="settings-btn settings-btn-secondary"
                  onClick={() => void handleTestWeixinConfig()}
                  disabled={weixinSaving || weixinTesting}
                >
                  {weixinTesting ? '测试中…' : '测试连接'}
                </button>
                <button
                  type="button"
                  className="settings-btn settings-btn-primary"
                  onClick={handleSaveWeixinConfig}
                  disabled={weixinSaving || weixinTesting}
                >
                  {weixinSaving ? '保存中…' : '保存并启用'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showOpenSourceNotice && (
        <div className="settings-developer-overlay" onClick={() => setShowOpenSourceNotice(false)}>
          <div className="settings-developer-modal settings-qq-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-developer-header">
              <h3>第三方声明（含开源许可）</h3>
              <button type="button" className="settings-developer-close" onClick={() => setShowOpenSourceNotice(false)}>
                ×
              </button>
            </div>
            <div className="settings-developer-body settings-qq-body">
              {openSourceNoticeLoading && <div className="settings-version-hint">读取中…</div>}
              {openSourceNoticeError && <div className="settings-error">{openSourceNoticeError}</div>}
              {!openSourceNoticeLoading && !openSourceNoticeError && (
                <pre className="settings-notice-pre">{openSourceNoticeText}</pre>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="settings-header">
        <h2>设置</h2>
      </div>
      <div className="settings-content">
        <div className="settings-group">
          <label>通用 API 基础地址</label>
          <input
            type="text"
            defaultValue={serverUrl}
            onBlur={handleServerChange}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className="settings-input"
            placeholder={DEFAULT_SERVER_URL}
          />
        </div>
        <div className="settings-group">
          <label>跨设备/好友聊天服务地址（v4）</label>
          <input
            type="text"
            defaultValue={customerServiceUrl}
            onBlur={handleCustomerServiceChange}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className="settings-input"
            placeholder={DEFAULT_CUSTOMER_SERVICE_URL}
          />
          {customerServiceSyncHint && <div className="settings-version-hint">{customerServiceSyncHint}</div>}
        </div>
        <div className="settings-group">
          <label>聊天小助手服务地址（v10）</label>
          <input
            type="text"
            defaultValue={chatAssistantUrl}
            onBlur={handleChatAssistantChange}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className="settings-input"
            placeholder={DEFAULT_CHAT_ASSISTANT_URL}
          />
        </div>
        <div className="settings-group">
          <label>技能社区服务地址（v9）</label>
          <input
            type="text"
            defaultValue={skillCommunityUrl}
            onBlur={handleSkillCommunityChange}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className="settings-input"
            placeholder={DEFAULT_SKILL_COMMUNITY_URL}
          />
        </div>
        <div className="settings-group">
          <label>当前 IMEI</label>
          <div className="settings-value">{imei || '-'}</div>
        </div>
        <div className="settings-group">
          <label>默认内置服务地址（调试）</label>
          <div className="settings-value settings-value-debug">
            <div>默认 IP：{builtinDefaultIp}</div>
            <div>TopoClaw：{builtinDefaultUrls?.topoclaw || '—'}</div>
            <div>GroupManager：{builtinDefaultUrls?.groupmanager || '—'}</div>
          </div>
          <div className="settings-value-row">
            <button
              type="button"
              className="settings-btn settings-btn-secondary settings-check-update-btn"
              disabled={builtinUrlLoading}
              onClick={refreshBuiltinDefaultUrls}
            >
              {builtinUrlLoading ? '刷新中…' : '刷新默认地址'}
            </button>
          </div>
          {builtinUrlHint && <div className="settings-version-hint">{builtinUrlHint}</div>}
        </div>
        <div className="settings-group">
          <label>应用版本</label>
          <div className="settings-value settings-value-row">
            <span>{appVersion}</span>
            <button
              type="button"
              className="settings-btn settings-btn-secondary settings-check-update-btn"
              disabled={versionCheckBusy}
              onClick={handleCheckDesktopUpdate}
            >
              {versionCheckBusy ? '检查中…' : '检查更新'}
            </button>
          </div>
          {versionCheckHint && <div className="settings-version-hint">{versionCheckHint}</div>}
        </div>
        <div className="settings-group">
          <label>第三方声明（含开源许可）</label>
          <button
            type="button"
            className="settings-btn settings-btn-secondary settings-developer-entry"
            onClick={openOpenSourceNotice}
          >
            查看声明
          </button>
        </div>
        <div className="settings-group">
          <label>开发者选项</label>
          <button
            type="button"
            className="settings-btn settings-btn-secondary settings-developer-entry"
            onClick={() => setShowDeveloper(true)}
          >
            进入开发者工具
          </button>
        </div>
        <div className="settings-group">
          <label>QQ 通道接入</label>
          <button
            type="button"
            className="settings-btn settings-btn-secondary settings-developer-entry"
            onClick={() => void openQqConfigModal()}
          >
            配置 QQ 机器人
          </button>
        </div>
        <div className="settings-group">
          <label>微信通道接入</label>
          <button
            type="button"
            className="settings-btn settings-btn-secondary settings-developer-entry"
            onClick={() => void openWeixinConfigModal()}
          >
            配置微信通道
          </button>
        </div>
        <div className="settings-group settings-group-toggle">
          <label className="settings-toggle-row">
            <span>开启所有内置服务</span>
            <input
              type="checkbox"
              checked={builtinServicesEnabled}
              onChange={(e) => void handleBuiltinServicesToggle(e)}
              className="settings-toggle-input"
              disabled={builtinServicesSaving}
            />
            <span className="settings-toggle-slider" />
          </label>
          <div className="settings-toggle-desc">
            关闭后将停止 TopoClaw / GroupManager，并禁用内置终端执行
          </div>
          {builtinServicesHint ? <div className="settings-version-hint">{builtinServicesHint}</div> : null}
        </div>
        <div className="settings-group settings-group-toggle">
          <label className="settings-toggle-row">
            <span>数字分身</span>
            <input
              type="checkbox"
              checked={digitalCloneEnabled}
              onChange={(e) => void handleDigitalCloneChange(e)}
              className="settings-toggle-input"
              disabled={!imei || digitalCloneLoading}
            />
            <span className="settings-toggle-slider" />
          </label>
          <div className="settings-toggle-desc">
            作为默认开关；好友会话右上角可单独覆盖当前好友
          </div>
        </div>
        <div className="settings-group settings-group-toggle">
          <label className="settings-toggle-row">
            <span>是否自动执行代码</span>
            <input
              type="checkbox"
              checked={autoExecuteCode}
              onChange={handleAutoExecuteChange}
              className="settings-toggle-input"
            />
            <span className="settings-toggle-slider" />
          </label>
          <div className="settings-toggle-desc">开启后，模型生成的 Python 代码将自动执行</div>
        </div>
        <div className="settings-actions">
          <button className="settings-btn settings-btn-secondary" onClick={() => setShowNewAssistant(true)}>
            新建小助手
          </button>
          <button
            type="button"
            className="settings-btn settings-btn-secondary"
            onClick={() => void handleAdaptAssistantIds()}
            disabled={adaptAssistantIdsBusy}
            title="将当前账号在云侧与群组内的助手标识统一到新体系（displayId 优先）"
          >
            {adaptAssistantIdsBusy ? '适配中…' : '适配新助手id'}
          </button>
          {typeof window !== 'undefined' && window.terminalAPI && (
            <button
              type="button"
              className="settings-btn settings-btn-secondary"
              onClick={() => window.terminalAPI!.openWindow()}
              title={builtinServicesEnabled ? '在独立窗口中打开终端，可使用捆绑的 Python 环境' : '内置服务已关闭，终端不可用'}
              disabled={!builtinServicesEnabled}
            >
              打开 Python 终端
            </button>
          )}
        </div>
        <div className="settings-actions">
          <button className="settings-btn settings-btn-secondary" onClick={handleClearChatHistory}>
            清空聊天记录
          </button>
          <button className="settings-btn settings-btn-danger" onClick={handleLogout}>
            切换账号
          </button>
        </div>
      </div>
    </div>
  )
}
