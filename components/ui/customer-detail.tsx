"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface Props {
  open: boolean
  onClose: () => void
  customer: any
}

export default function CustomerDetailModal({ open, onClose, customer }: Props) {
  if (!customer) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Detail Pelanggan
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          <Field label="Nama" value={customer.name} />
          <Field label="No Telepon" value={customer.phone} />
          <Field label="Email" value={customer.email} />
          <Field label="Alamat" value={customer.address} />

          <div className="flex justify-end pt-4">
            <Button variant="secondary" onClick={onClose}>
              Tutup
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
        {value || "-"}
      </div>
    </div>
  )
}