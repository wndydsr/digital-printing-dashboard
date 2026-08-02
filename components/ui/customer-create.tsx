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
import { toast } from "sonner"

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

  const [errors, setErrors] = useState<any>({})

  const handleChange = (field: string, value: string) => {
    setFormData({
      ...formData,
      [field]: value,
    })
  }

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem("token")

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api"}/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          Authorization: `Bearer ${token}`, 
        },
        body: JSON.stringify(formData),
      })

      const text = await res.text()
      console.log("RESPONSE:", text)

      let data: any = {}
      try {
        data = JSON.parse(text)
      } catch {
        // kalau bukan JSON, biarin kosong
      }

      if (!res.ok) {
        setErrors(data.errors || {})

        let firstError = "Terjadi kesalahan"

        if (data?.errors) {
          const errorsArr = Object.values(data.errors) as string[][]
          firstError = errorsArr[0][0]

          if (data.errors.phone) {
            firstError = "Nomor telepon sudah terdaftar"
          }
        } else if (data?.message) {
          firstError = data.message
        }

        toast.error(firstError)
        return
      }

      toast.success("Data pelanggan berhasil ditambahkan") 

      setErrors({})

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
      toast.error("Terjadi kesalahan pada sistem.")
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
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name[0]}</p>}
          </div>

          <div>
            <label className="text-sm">No Telepon</label>
            <Input
              placeholder="08xxxx"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              className={errors.phone ? "border-red-500" : ""}
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone[0]}</p>}
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