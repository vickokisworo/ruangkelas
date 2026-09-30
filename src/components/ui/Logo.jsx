export default function Logo({ compact = false, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 text-ink ${className}`}>
      <svg
        width={compact ? 20 : 28}
        height={compact ? 20 : 28}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="3.5"
          y="4"
          width="17"
          height="16"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path d="M12 4v16" stroke="currentColor" strokeWidth="1.6" />
      </svg>
      <span
        className={`font-display font-semibold tracking-[0.12em] ${
          compact ? 'text-sm' : 'text-lg'
        }`}
      >
        Ruang Kelas
      </span>
    </span>
  )
}
