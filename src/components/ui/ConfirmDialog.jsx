export default function ConfirmDialog({
  terbuka,
  judul,
  isi,
  yaLabel = 'Ya',
  batalLabel = 'Batal',
  bahaya = false,
  disabled = false,
  onYa,
  onBatal,
}) {
  if (!terbuka) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-5">
      <button
        type="button"
        className="absolute inset-0 bg-ink/40"
        aria-label="Tutup"
        disabled={disabled}
        onClick={onBatal}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="judul-konfirmasi"
        className="relative w-full max-w-sm rounded-md border border-line bg-paper p-5 shadow-lg"
      >
        {judul && (
          <h2 id="judul-konfirmasi" className="text-base font-semibold text-ink">
            {judul}
          </h2>
        )}
        {isi && <p className={`text-sm text-pencil ${judul ? 'mt-2' : ''}`}>{isi}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            className="px-2 py-1 text-sm text-pencil hover:text-ink disabled:opacity-50"
            disabled={disabled}
            onClick={onBatal}
          >
            {batalLabel}
          </button>
          <button
            type="button"
            className={`px-2 py-1 text-sm font-medium disabled:opacity-50 ${
              bahaya ? 'text-marker' : 'text-chalk'
            }`}
            disabled={disabled}
            onClick={onYa}
          >
            {yaLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
