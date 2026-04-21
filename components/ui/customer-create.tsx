"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CustomerCreateModal({
  open,
  onClose,
  onSuccess,
}: Props) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  })

  const handleChange = (field: string, value: string) => {
    setFormData({
      ...formData,
      [field]: value,
    })
  }

  const handleSubmit = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const text = await res.text()
      console.log("RESPONSE:", text)

      if (!res.ok) {
        console.error("Gagal kirim data")
        return
      }

      const data = JSON.parse(text)
      console.log("SUCCESS:", data)

      onSuccess()
      onClose()
  
      // reset form
      setFormData({
        name: "",
        phone: "",
        email: "",
        address: "",
      })

    } catch (err) {
      console.error("ERROR:", err)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle>Tambah Pelanggan</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          <div>
            <label className="text-sm">Nama</label>
            <Input
              placeholder="Nama pelanggan"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm">No Telepon</label>
            <Input
              placeholder="08xxxx"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm">Email</label>
            <Input
              type="email"
              placeholder="email@gmail.com"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm">Alamat</label>
            <Input
              placeholder="Alamat lengkap"
              value={formData.address}
              onChange={(e) => handleChange("address", e.target.value)}
            />
          </div>

          {/* ACTION */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Batal
            </Button>

            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleSubmit}
            >
              Simpan
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}