import ThemeToggle from '@/components/ui/ThemeToggle'
import Logo from '@/components/ui/Logo'

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-5 py-12">
      <ThemeToggle className="absolute right-4 top-4" />
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <Logo className="mb-8" />
          <h1 className="text-2xl font-semibold text-ink">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-pencil">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  )
}
