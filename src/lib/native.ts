import { useEffect } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { useFarm } from '../state/farm'
import { useSettings } from '../state/settings'
import { computeReminders } from './reminders'
import { parseISO, today } from './dates'

export const isNative = () => Capacitor.isNativePlatform()

const ROOTS = ['/', '/herd', '/finance', '/reports', '/more']

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h) % 2147483000
}

export function useNativeIntegration(nav: NavigateFunction) {
  const f = useFarm()
  const { t, settings } = useSettings()

  // Android "orqaga" tugmasi
  useEffect(() => {
    if (!isNative()) return
    const sub = App.addListener('backButton', () => {
      const path = window.location.hash.replace(/^#/, '') || '/'
      if (document.querySelector('.animate-sheet')) {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
        return
      }
      if (ROOTS.includes(path)) {
        if (path === '/') App.exitApp()
        else nav('/')
      } else nav(-1)
    })
    return () => {
      sub.then((s) => s.remove())
    }
  }, [nav])

  // Eslatmalarni telefon bildirishnomalariga rejalashtirish
  const items = computeReminders(f, t, settings.lastBackup)
  const key = items.map((i) => i.id + i.date).join('|') + settings.notifications
  useEffect(() => {
    if (!isNative()) return
    const run = async () => {
      try {
        const pending = await LocalNotifications.getPending()
        if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) })
        if (!settings.notifications) return
        const perm = await LocalNotifications.checkPermissions()
        if (perm.display !== 'granted') {
          const r = await LocalNotifications.requestPermissions()
          if (r.display !== 'granted') return
        }
        const now = Date.now()
        const list = items
          .filter((i) => i.date >= today() && i.kind !== 'backup')
          .slice(0, 50)
          .map((i) => {
            const at = parseISO(i.date)
            at.setHours(9, 0, 0, 0)
            if (at.getTime() <= now) at.setTime(now + 60_000)
            return { id: hash(i.id), title: i.title, body: i.sub ?? '', schedule: { at }, isExactNotification: false }
          })
        if (list.length) await LocalNotifications.schedule({ notifications: list })
      } catch (e) {
        console.warn('notifications', e)
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}

/** Faylni saqlash: Android'da ulashish oynasi, brauzerda yuklab olish */
export async function saveFile(name: string, data: string | Blob, mime: string) {
  if (isNative()) {
    let base64: string | undefined
    let text: string | undefined
    if (typeof data === 'string') text = data
    else base64 = await blobToBase64(data)
    const res = await Filesystem.writeFile({
      path: name,
      data: text ?? base64!,
      directory: Directory.Cache,
      ...(text != null ? { encoding: Encoding.UTF8 } : {}),
    })
    try {
      await Filesystem.writeFile({
        path: 'ChorvaHisob/' + name,
        data: text ?? base64!,
        directory: Directory.Documents,
        recursive: true,
        ...(text != null ? { encoding: Encoding.UTF8 } : {}),
      })
    } catch {
      /* Documents papkasiga ruxsat bo'lmasa — faqat ulashish */
    }
    await Share.share({ title: name, url: res.uri })
    return
  }
  const blob = typeof data === 'string' ? new Blob([data], { type: mime }) : data
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

function blobToBase64(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = reject
    r.readAsDataURL(b)
  })
}
