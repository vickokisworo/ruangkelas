import { useTema } from '@/context/ThemeContext'

export default function ThemeToggle({ className = '' }) {
  const { gelap, toggleTema } = useTema()

  return (
    <button
      type="button"
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-pencil hover:text-ink ${className}`}
      aria-label={gelap ? 'Mode terang' : 'Mode gelap'}
      onClick={toggleTema}
    >
      {gelap ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v2M12 19v2M5 12H3M21 12h-2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4 7 7 0 0 0 20 14.5Z" />
        </svg>
      )}
    </button>
  )
}
