"use client"

type Props = {
  open: boolean
  onClose: () => void
  onDelete: () => void
}

export default function DeleteModal({ open, onClose, onDelete }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-80">
        <h2 className="text-lg font-semibold mb-2">
          Konfirmasi Hapus
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Yakin mau hapus data ini?
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1 border rounded"
          >
            Batal
          </button>

          <button
            onClick={onDelete}
            className="bg-red-500 text-white px-3 py-1 rounded"
          >
            Hapus
          </button>
        </div>
      </div>
    </div>
  )
}