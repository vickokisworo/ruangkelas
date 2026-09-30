import { createContext, useContext } from 'react'

const KelasContext = createContext(undefined)

// Info kelas milik user yang sedang login (diisi sekali oleh RequireKelas,
// dipakai bersama oleh layout/menu navigasi tanpa fetch ulang per halaman).
export function KelasProvider({ value, children }) {
  return <KelasContext.Provider value={value}>{children}</KelasContext.Provider>
}

export function useKelas() {
  const context = useContext(KelasContext)
  if (context === undefined) {
    throw new Error('useKelas harus dipakai di dalam <KelasProvider> (lewat RequireKelas)')
  }
  return context
}
