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
import { useToast } from "@/components/ui/use-toast"

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function KaryawanCreateModal({
  open,
  onClose,
  onSuccess,
}: Props) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "operator", // Default role
  })

  const [errors, setErrors] = useState<any>({})

  const handleChange = (field: string, value: string) => {
    setFormData({
      ...formData,
      [field]: value,
    })
  }

  const { toast } = useToast()

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem("token")

      // Pastikan endpoint mengarah ke /api/karyawan
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api"}/karyawan`, {
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

          // Custom pesan error yang lebih ramah
          if (data.errors.email) {
            firstError = "Email ini sudah terdaftar"
          }
        } else if (data?.message) {
          firstError = data.message
        }

        toast({
          title: "Gagal",
          description: firstError,
          variant: "destructive",
        })

        return
      }

      toast({
        title: "Berhasil",
        description: "Data karyawan berhasil ditambahkan",
      })

      setErrors({})

      onSuccess()
      onClose()
  
      // Reset form
      setFormData({
        name: "",
        email: "",
        password: "",
        role: "operator",
      })

    } catch (err) {
      console.error("ERROR:", err)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle>Tambah Karyawan</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          {/* NAMA */}
          <div>
            <label className="text-sm font-medium">Nama</label>
            <Input
              placeholder="Nama karyawan"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name[0]}</p>}
          </div>

          {/* EMAIL */}
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              placeholder="email@gmail.com"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email[0]}</p>}
          </div>

          {/* PASSWORD */}
          <div>
            <label className="text-sm font-medium">Password</label>
            <Input
              type="password"
              placeholder="Minimal 6 karakter"
              value={formData.password}
              onChange={(e) => handleChange("password", e.target.value)}
              className={errors.password ? "border-red-500" : ""}
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password[0]}</p>}
          </div>

          {/* ROLE / PERAN */}
          <div>
            <label className="text-sm font-medium">Role / Peran</label>
            <select
              value={formData.role}
              onChange={(e) => handleChange("role", e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="operator">Operator</option>
              <option value="desainer">Desainer</option>
              <option value="kurir">Kurir</option>
            </select>
            {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role[0]}</p>}
          </div>

          {/* ACTION */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Batal
            </Button>

            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white"
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