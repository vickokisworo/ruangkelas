import AppRoutes from '@/app/AppRoutes'
import HalamanPasang from '@/pwa/HalamanPasang'
import { sudahTerpasang } from '@/pwa/pwa'

export default function App() {
  if (!sudahTerpasang()) return <HalamanPasang />
  return <AppRoutes />
}