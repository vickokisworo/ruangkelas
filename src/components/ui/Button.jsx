export default function Button({ children, variant = 'primary', className = '', ...props }) {
  const base =
    'w-full rounded-md px-4 py-3 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const styles = {
    primary: 'bg-chalk text-paper hover:bg-chalk/90',
    secondary: 'bg-transparent text-ink border border-line hover:border-ink',
  }
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
