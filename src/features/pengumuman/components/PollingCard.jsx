export default function PollingCard({ polling, isPengurus, processing, onVote, onToggleTutup }) {
  const sudahMemilih = polling.suaraSaya !== null
  // Hasil tampil setelah memilih (biar pilihan tidak terpengaruh), saat ditutup, atau untuk pengurus
  const tampilHasil = sudahMemilih || polling.ditutup || isPengurus

  return (
    <div className="mt-3 rounded-md border border-line bg-paper p-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-pencil">
        Polling{polling.ditutup && ' · Ditutup'}
      </p>

      <div className="space-y-2">
        {polling.opsi.map((o) => {
          const persen = polling.totalSuara ? Math.round((o.jumlah / polling.totalSuara) * 100) : 0
          const dipilih = polling.suaraSaya === o.id

          return (
            <button
              key={o.id}
              type="button"
              disabled={polling.ditutup || processing}
              onClick={() => onVote(o.id)}
              className={`relative w-full overflow-hidden rounded-md border px-3 py-2 text-left text-sm transition-colors disabled:cursor-default ${
                dipilih ? 'border-chalk' : 'border-line hover:border-pencil'
              }`}
            >
              {tampilHasil && (
                <span
                  className="absolute inset-y-0 left-0 bg-chalk/15"
                  style={{ width: `${persen}%` }}
                />
              )}
              <span className="relative flex items-center justify-between gap-3">
                <span className={dipilih ? 'font-medium text-ink' : 'text-ink'}>
                  {dipilih && '✓ '}
                  {o.teks}
                </span>
                {tampilHasil && (
                  <span className="shrink-0 text-pencil">
                    {o.jumlah} · {persen}%
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-pencil">
          {polling.totalSuara} suara
          {!polling.ditutup && sudahMemilih && ' · kamu bisa ganti pilihan'}
        </p>
        {isPengurus && (
          <button
            type="button"
            disabled={processing}
            onClick={onToggleTutup}
            className="text-xs font-medium text-chalk hover:underline disabled:opacity-50"
          >
            {polling.ditutup ? 'Buka kembali' : 'Tutup polling'}
          </button>
        )}
      </div>
    </div>
  )
}
