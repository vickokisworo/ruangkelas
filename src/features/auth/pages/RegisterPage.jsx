import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '@/features/auth/services/authService'
import { ROUTES } from '@/config/routes'
import { toFriendlyErrorMessage } from '@/utils/errors'
import AuthLayout from '@/components/layout/AuthLayout'
import { Field, Button } from '@/components/ui'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ nama: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: signUpError } = await authService.signUp(form)

    setLoading(false)
    if (signUpError) {
      setError(toFriendlyErrorMessage(signUpError))
      return
    }
    navigate(ROUTES.MULAI_KELAS)
  }

  return (
    <AuthLayout eyebrow="RuangKelas" title="Buat akun" subtitle="Khusus buat kamu, siswa SMA.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="Nama lengkap"
          name="nama"
          type="text"
          placeholder="Nama kamu"
          value={form.nama}
          onChange={handleChange}
          required
        />
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
          placeholder="Minimal 6 karakter"
          value={form.password}
          onChange={handleChange}
          minLength={6}
          required
        />
        {error && <p className="text-sm text-marker">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? 'Memproses...' : 'Daftar'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-pencil">
        Sudah punya akun?{' '}
        <Link to={ROUTES.LOGIN} className="font-medium text-chalk">
          Masuk
        </Link>
      </p>
    </AuthLayout>
  )
}
