import { useEffect } from 'react'
import AppRoutes from '@/app/AppRoutes'
import HalamanPasang from '@/pwa/HalamanPasang'
import { mintaIzinOtomatis, sudahTerpasang } from '@/pwa/pwa'

export default function App() {
  const terpasang = sudahTerpasang()

  useEffect(() => {
    if (!terpasang) return undefined
    mintaIzinOtomatis().catch(() => {})
    const mintaSaatSentuh = () => {
      mintaIzinOtomatis().catch(() => {})
      window.removeEventListener('pointerdown', mintaSaatSentuh)
    }
    window.addEventListener('pointerdown', mintaSaatSentuh)
    return () => window.removeEventListener('pointerdown', mintaSaatSentuh)
  }, [terpasang])

  if (!terpasang) return <HalamanPasang />
  return <AppRoutes />
}