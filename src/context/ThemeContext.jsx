import { createContext, useContext, useEffect, useState } from 'react'

const KEY = 'ruangkelas-tema'
const ThemeContext = createContext({ gelap: false, toggleTema: () => {} })

function bacaAwal() {
  try {
    const simpan = localStorage.getItem(KEY)
    if (simpan === 'gelap') return true
    if (simpan === 'terang') return false
  } catch {
    /* ignore */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

export function ThemeProvider({ children }) {
  const [gelap, setGelap] = useState(bacaAwal)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', gelap)
    try {
      localStorage.setItem(KEY, gelap ? 'gelap' : 'terang')
    } catch {
      /* ignore */
    }
  }, [gelap])

  return (
    <ThemeContext.Provider value={{ gelap, toggleTema: () => setGelap((n) => !n) }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTema() {
  return useContext(ThemeContext)
}
