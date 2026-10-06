import { supabase } from '@/lib/supabase'
import { VAPID_PUBLIC_KEY } from '@/pwa/vapid'

const KUNCI_NOTIF = 'ruangkelas-notifikasi-hp'
let acaraPasang = null
const pendengarPasang = new Set()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    acaraPasang = event
    pendengarPasang.forEach((fn) => fn(acaraPasang))
  })
}

export function daftarkanServiceWorker() {
  if (!('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

export function sudahTerpasang() {
  return (
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  )
}

export function onBisaPasang(callback) {
  pendengarPasang.add(callback)
  if (acaraPasang) callback(acaraPasang)
  return () => pendengarPasang.delete(callback)
}

export async function pasangAplikasi() {
  if (!acaraPasang) return false
  acaraPasang.prompt()
  const hasil = await acaraPasang.userChoice
  acaraPasang = null
  return hasil.outcome === 'accepted'
}

export function notifikasiHpNyala() {
  try {
    return localStorage.getItem(KUNCI_NOTIF) !== 'mati'
  } catch {
    return true
  }
}

export function simpanNotifikasiHp(nyala) {
  try {
    localStorage.setItem(KUNCI_NOTIF, nyala ? 'nyala' : 'mati')
  } catch {
    /* abaikan */
  }
}

export async function mintaNotifikasiPonsel() {
  if (!('Notification' in window)) return 'tidak-didukung'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.requestPermission()
}

function kunciVapid() {
  const padding = '='.repeat((4 - (VAPID_PUBLIC_KEY.length % 4)) % 4)
  const base64 = (VAPID_PUBLIC_KEY + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export async function daftarPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return { error: 'tidak-didukung' }
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: kunciVapid(),
  })
  const json = sub.toJSON()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { error: 'belum-masuk' }
  const { error } = await supabase.from('push_langganan').upsert(
    {
      user_id: userData.user.id,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    { onConflict: 'endpoint' },
  )
  return { error }
}

export async function hapusPush() {
  try {
    const reg = await navigator.serviceWorker?.ready
    const sub = await reg?.pushManager.getSubscription()
    const endpoint = sub?.endpoint
    await sub?.unsubscribe()
    if (endpoint) await supabase.from('push_langganan').delete().eq('endpoint', endpoint)
  } catch {
    /* abaikan */
  }
}

export async function tampilkanNotifikasiPonsel(item) {
  if (!notifikasiHpNyala()) return
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const judul = item.judul || 'Ruang Kelas'
  const opsi = {
    body: item.isi || 'Ada pengingat baru.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: item.id,
    data: { url: item.tautan || '/dashboard' },
  }
  try {
    const reg = await navigator.serviceWorker?.ready
    if (reg?.showNotification) {
      await reg.showNotification(judul, opsi)
      return
    }
  } catch {
    /* fallback di bawah */
  }
  new Notification(judul, opsi)
}

export async function sinkronPushOtomatis() {
  if (!notifikasiHpNyala()) return
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  await daftarPush()
}

export async function mintaIzinOtomatis() {
  if (!sudahTerpasang()) return
  if (!notifikasiHpNyala()) return
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return
  if (Notification.permission === 'denied') return
  const hasil = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
  if (hasil === 'granted') {
    simpanNotifikasiHp(true)
    await daftarPush()
  }
}

