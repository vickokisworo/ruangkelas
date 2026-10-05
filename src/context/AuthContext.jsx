import { createContext, useContext, useEffect, useState } from 'react'
import { authService } from '@/features/auth/services/authService'
import { sinkronPushOtomatis } from '@/pwa/pwa'

const AuthContext = createContext(undefined)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authService.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
      if (data.session?.user) {
        sinkronPushOtomatis().catch(() => {})
      }
    })

    const {
      data: { subscription },
    } = authService.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession?.user) {
        sinkronPushOtomatis().catch(() => {})
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const value = { session, user: session?.user ?? null, loading }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth harus dipakai di dalam <AuthProvider>')
  }
  return context
}
