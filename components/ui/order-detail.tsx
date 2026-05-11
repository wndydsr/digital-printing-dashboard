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

  const referenceFiles = order.reference_file || []

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl rounded-xl max-h-[90vh] overflow-y-auto">
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
          {/* Produk tetap */}
          <Field label="Produk" value={order.product?.name || "-"} />

          {/* 🔥 Dynamic fields */}
          {Object.entries(parsed)
            .filter(([key]) => key !== "file") // 🚫 buang file
            .map(([key, value]) => (
              <Field
                key={key}
                label={formatLabel(key)}
                value={value}
              />
          ))}
        </div>

          {/* Catatan */}
          <div>
            <label className="text-sm text-gray-500">Catatan</label>
            <div className="border rounded-md p-3 bg-gray-50 min-h-[100px]">
              {order.catatan || "-"}
            </div>
          </div>

          {/* FILE DESAIN */}
          {order.design_url && (
            <div>
              <label className="text-sm text-gray-500">
                File Desain
              </label>

              <div className="border rounded-lg p-4 bg-gray-50 flex justify-center">
                <img
                  src={`http://127.0.0.1:8000/storage/${order.design_url}`}
                  alt="desain"
                  className="rounded-md max-h-[250px]"
                />
              </div>
            </div>
          )}

          {/* FILE PENDUKUNG */}
          {referenceFiles.length > 0 && (
            <div>
              <label className="text-sm text-gray-500">
                File Pendukung
              </label>

              <div className="border rounded-lg p-4 bg-gray-50 space-y-3">

                {referenceFiles.map(
                  (file: string, index: number) => (

                    <div
                      key={index}
                      className="border rounded-md p-3 bg-white"
                    >

                      <img
                        src={`http://127.0.0.1:8000/storage/${file}`}
                        alt={`reference-${index}`}
                        className="rounded-md max-h-[250px] mx-auto"
                      />

                      <a
                        href={`http://127.0.0.1:8000/storage/${file}`}
                        target="_blank"
                        className="text-blue-600 underline text-sm block mt-2 text-center"
                      >
                        Download File {index + 1}
                      </a>

                    </div>

                  )
                )}

              </div>
            </div>
          )}

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

function formatLabel(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase())
}

function Field({ label, value }: { label: string; value: any }) {
  let display = "-"

  if (value !== null && value !== undefined) {
    if (typeof value === "object") {
      // kalau array
      if (Array.isArray(value)) {
        display = value.join(", ")
      } 
      // kalau object
      else {
        display = Object.values(value).join(", ")
      }
    } else {
      display = value
    }
  }

  return (
    <div>
      <label className="text-sm text-gray-500">{label}</label>
      <div className="border rounded-md p-2 bg-gray-50">
        {display}
      </div>
    </div>
  )
}