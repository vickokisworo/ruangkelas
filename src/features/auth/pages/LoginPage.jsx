import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '@/features/auth/services/authService'
import { ROUTES } from '@/config/routes'
import { toFriendlyErrorMessage } from '@/utils/errors'
import AuthLayout from '@/components/layout/AuthLayout'
import { Field, Button } from '@/components/ui'

export default function LoginPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: signInError } = await authService.signIn(form)

    setLoading(false)
    if (signInError) {
      setError(toFriendlyErrorMessage(signInError))
      return
    }
    navigate(ROUTES.DASHBOARD)
  }

  return (
    <AuthLayout eyebrow="RuangKelas" title="Masuk" subtitle="Lanjut ke ruang kelas kamu.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="Email"
          name="email"
          type="email"
          placeholder="kamu@email.com"
          value={form.email}
          onChange={handleChange}
          required
        />
        <Field
          label="Kata sandi"
          name="password"
          type="password"
          placeholder="Kata sandi kamu"
          value={form.password}
          onChange={handleChange}
          required
        />
        {error && <p className="text-sm text-marker">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? 'Memproses...' : 'Masuk'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-pencil">
        Belum punya akun?{' '}
        <Link to={ROUTES.REGISTER} className="font-medium text-chalk">
          Daftar
        </Link>
      </p>
    </AuthLayout>
  )
}
