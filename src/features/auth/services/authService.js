import { supabase } from '@/lib/supabase'

export const authService = {
  async signUp({ nama, email, password }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nama } },
    })
    if (error) return { data: null, error }

    if (data.user) {
      const { error: profileError } = await supabase
        .from('users')
        .upsert({ id: data.user.id, nama, email })
      if (profileError) return { data: null, error: profileError }
    }

    return { data, error: null }
  },

  async signIn({ email, password }) {
    return supabase.auth.signInWithPassword({ email, password })
  },

  async signOut() {
    return supabase.auth.signOut()
  },

  async getSession() {
    return supabase.auth.getSession()
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  },
}
