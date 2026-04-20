"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface OrderDetailModalProps {
  open: boolean
  onClose: () => void
  order: any
}


export default function OrderDetailModal({ open, onClose, order }: OrderDetailModalProps) {
  if (!order) return null

  const parsed = (() => {
    try {
      return JSON.parse(order.notes)
    } catch {
      return {}
    }
  })()

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Detail Pesanan
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Nama */}
          <div>
            <label className="text-sm text-gray-500">Nama Pelanggan</label>
            <div className="border rounded-md p-2 bg-gray-50">
              {order.customer?.name}
            </div>
          </div>

          {/* Grid */}
        <div className="grid grid-cols-4 gap-4">
        <Field label="Produk" value={order.product?.name || "-"} />
        <Field label="Bahan" value={parsed.material || "-"} />
        <Field label="Panjang (cm)" value={parsed.tinggi || "-"} />
        <Field label="Lebar (cm)" value={parsed.lebar || "-"} />

        <Field label="Finishing" value={parsed.finishing || "-"} />
        <Field label="Deadline" value={parsed.deadline || "-"} />
        <Field label="Jumlah" value={parsed.qty || "1"} />
      </div>

          {/* Catatan */}
          <div>
            <label className="text-sm text-gray-500">Catatan</label>
            <div className="border rounded-md p-3 bg-gray-50 min-h-[100px]">
              {parsed.catatan || "-"}
            </div>
          </div>

          {/* Desain */}
          <div>
            <label className="text-sm text-gray-500">Desain</label>
            <div className="border rounded-lg p-4 bg-gray-50 flex justify-center">
              <img
                src={order.design_url || "/placeholder.png"}
                alt="desain"
                className="rounded-md max-h-[200px]"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={onClose}>
              Batal
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700">
              Download Desain
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <label className="text-sm text-gray-500">{label}</label>
      <div className="border rounded-md p-2 bg-gray-50">
        {value}
      </div>
    </div>
  )
}