export function daftarkanServiceWorker() {
  if (!('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

export async function mintaNotifikasiPonsel() {
  if (!('Notification' in window)) return 'tidak-didukung'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.requestPermission()
}

export async function tampilkanNotifikasiPonsel(item) {
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
