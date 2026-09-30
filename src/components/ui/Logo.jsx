export default function Logo({ compact = false, className = '' }) {
  const ukuran = compact ? 'h-12 w-auto' : 'h-20 w-auto'

  return (
    <span className={`inline-flex items-center ${className}`}>
      <img src="/logo.png" alt="Ruang Kelas" className={`${ukuran} dark:hidden`} />
      <img src="/logo-dark.png" alt="Ruang Kelas" className={`${ukuran} hidden dark:block`} />
    </span>
  )
}
