export default function Field({ label, error, className = '', ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <input
        className={`w-full rounded-md border border-line bg-paper px-3.5 py-2.5 text-ink outline-none transition-colors focus:border-chalk ${className}`}
        {...props}
      />
      {error && <span className="mt-1 block text-sm text-marker">{error}</span>}
    </label>
  )
}
