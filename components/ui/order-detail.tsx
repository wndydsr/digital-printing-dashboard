"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface OrderDetailModalProps {
  open: boolean
  onClose: () => void
  order: any
}

export default function OrderDetailModal({
  open,
  onClose,
  order,
}: OrderDetailModalProps) {
  if (!order) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl rounded-xl max-h-[90vh] overflow-y-auto">

        <DialogHeader>
          <DialogTitle>Detail Pesanan</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">

          {/* CUSTOMER */}
          <div>
            <label className="text-sm text-gray-500">Customer</label>
            <div className="border rounded-md p-2 bg-gray-50">
              {order.customer?.name || "-"}
            </div>
          </div>

          {/* ORDER CODE */}
          <div>
            <label className="text-sm text-gray-500">No Pesanan</label>
            <div className="border rounded-md p-2 bg-gray-50">
              {order.order_code || "-"}
            </div>
          </div>

          {/* ITEMS */}
          {order.items?.map((item: any, i: number) => (
            <div key={i} className="border rounded-lg p-4 space-y-3">

              <h3 className="font-semibold text-sm text-gray-700">
                Item {i + 1}
              </h3>

              {/* PRODUK */}
              <Field label="Produk" value={item.product?.name} />

              {/* QTY */}
              <Field label="Qty" value={item.quantity} />

              {/* CATATAN */}
              <Field label="Catatan" value={item.catatan || "-"} />

              {/* DYNAMIC FIELDS */}
              {item.details &&
                Object.entries(parseJSON(item.details)).map(
                  ([key, value]: any) => (
                    <Field
                      key={key}
                      label={formatLabel(key)}
                      value={value}
                    />
                  )
                )}

              {/* DESIGN FILE */}
              {item.design?.design_file && (
                <div className="space-y-2">
                  <label className="text-sm text-gray-500">
                    File Desain
                  </label>

                  <img
                    src={`http://127.0.0.1:8000/storage/${item.design.design_file}`}
                    className="rounded-md max-h-[220px] border"
                  />
                </div>
              )}

              {/* REFERENCE FILES */}
              {item.design?.reference_files?.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm text-gray-500">
                    File Pendukung
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    {item.design.reference_files.map((file: string, idx: number) => (
                      <img
                        key={idx}
                        src={`http://127.0.0.1:8000/storage/${file}`}
                        className="rounded-md max-h-[180px] border"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* ACTION */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={onClose}>
              Tutup
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ================= HELPERS ================= */

function parseJSON(data: any) {
  try {
    return typeof data === "string" ? JSON.parse(data) : data || {}
  } catch {
    return {}
  }
}

function formatLabel(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase())
}

/* ================= FIELD COMPONENT ================= */

function Field({ label, value }: { label: string; value: any }) {
  let display = "-"

  if (value !== null && value !== undefined) {
    if (typeof value === "object") {
      display = Array.isArray(value)
        ? value.join(", ")
        : Object.values(value).join(", ")
    } else {
      display = String(value)
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