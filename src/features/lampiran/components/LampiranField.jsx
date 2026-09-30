import { MAX_LAMPIRAN_PER_ITEM, MAX_UKURAN_LAMPIRAN } from '@/config/constants'
import { formatUkuran } from '@/utils/lampiran'

export default function LampiranField({ files, onChange, disabled, sisa = MAX_LAMPIRAN_PER_ITEM }) {
  const bisaTambah = sisa > 0 && !disabled

  const handlePilih = (e) => {
    const tambahan = Array.from(e.target.files ?? [])
    onChange([...(files ?? []), ...tambahan].slice(0, (files?.length ?? 0) + sisa))
    e.target.value = ''
  }

  const handleHapus = (index) => {
    onChange((files ?? []).filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2 rounded-md border border-line p-3">
      <p className="text-sm font-medium text-ink">Unggah gambar atau dokumen</p>
      <p className="text-xs text-pencil">
        Maksimal {MAX_LAMPIRAN_PER_ITEM} berkas, {formatUkuran(MAX_UKURAN_LAMPIRAN)} per berkas.
        Format: gambar, PDF, Word, Excel, PowerPoint.
      </p>

      {(files ?? []).length > 0 && (
        <ul className="space-y-1">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-sm"
            >
              <span className="truncate text-ink">
                {file.name}
                <span className="ml-2 text-pencil">{formatUkuran(file.size)}</span>
              </span>
              <button
                type="button"
                className="ml-2 shrink-0 text-pencil hover:text-marker"
                aria-label={`Hapus ${file.name}`}
                onClick={() => handleHapus(i)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {bisaTambah ? (
        <label className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-line px-3 py-3 text-sm font-medium text-chalk hover:border-chalk">
          Pilih gambar / dokumen
          <input
            type="file"
            className="hidden"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
            onChange={handlePilih}
            disabled={disabled}
          />
        </label>
      ) : (
        <p className="text-xs text-pencil">Batas jumlah lampiran sudah tercapai.</p>
      )}
    </div>
  )
}
