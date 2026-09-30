import { APP_NAME } from '@/config/constants'
import ThemeToggle from '@/components/ui/ThemeToggle'

export default function AuthLayout({ eyebrow, title, subtitle, children }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-5 py-12">
      <ThemeToggle className="absolute right-4 top-4" />
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <div className="mb-6 inline-flex h-9 w-9 items-center justify-center rounded-md bg-chalk text-sm font-semibold text-paper">
            {APP_NAME.slice(0, 2).toUpperCase()}
          </div>
          {eyebrow && <p className="mb-1 text-sm text-pencil">{eyebrow}</p>}
          <h1 className="text-2xl font-semibold text-ink">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-pencil">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  )
}
