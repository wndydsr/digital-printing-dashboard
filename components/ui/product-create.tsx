"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2 } from "lucide-react"

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function ProductCreateModal({ open, onClose, onSuccess }: Props) {
  const [form, setForm] = useState({
    name: "",
    price: "",
    estimated_duration: "",
    status: "1",
  })

  const [photo, setPhoto] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [fields, setFields] = useState<CustomField[]>([])

  type CustomField = {
    name: string
    label: string
    type: string
    options?: string[] 
    }

    const generateName = (label: string) => {
    return label
        .toLowerCase()
        .replace(/\s+/g, "_") // spasi → _
        .replace(/[^a-z0-9_]/g, "") // hapus karakter aneh
    }

    const addField = () => {
    setFields([
        ...fields,
        { name: "", label: "", type: "text", options: [] },
    ])
    }

    const updateField = (index: number, key: string, value: any) => {
        const newFields = [...fields]
        newFields[index][key as keyof CustomField] = value
        setFields(newFields)
        }

    const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index))
    }

  const handleSubmit = async () => {
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append("name", form.name)
      formData.append("price", form.price)
      formData.append("estimated_duration", form.estimated_duration)
      formData.append("status", form.status)
      formData.append("fields", JSON.stringify(fields))

      if (photo) {
        formData.append("photo", photo)
      }


    const token = localStorage.getItem("token")

       await fetch("http://127.0.0.1:8000/api/products", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`, // 🔥 WAJIB
        },
        body: formData,
      })


      onSuccess()
      onClose()

      setForm({
        name: "",
        price: "",
        estimated_duration: "",
        status: "1",
      })
      setPhoto(null)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Produk</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          {/* Nama */}
          <div>
            <Label>Nama Produk</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          {/* Harga */}
          <div>
            <Label>Harga</Label>
            <Input
              type="number"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>

          {/* Estimasi */}
          <div>
            <Label>Estimasi (hari)</Label>
            <Input
              type="number"
              value={form.estimated_duration}
              onChange={(e) =>
                setForm({ ...form, estimated_duration: e.target.value })
              }
            />
          </div>

          {/* Status */}
          <div>
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(val) => setForm({ ...form, status: val })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Aktif</SelectItem>
                <SelectItem value="0">Tidak Aktif</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Upload Foto */}
          <div>
            <Label>Foto</Label>
            <Input
              type="file"
              onChange={(e) => setPhoto(e.target.files?.[0] || null)}
            />
          </div>

          <div className="space-y-3">
            <Label>Custom Fields</Label>

           {fields.map((field, index) => (
            <div key={index} className="border rounded-lg p-3 space-y-3 bg-gray-50">

                {/* 🔥 BARIS ATAS */}
                <div className="flex items-center gap-2">

                {/* LABEL */}
                <Input
                    className="flex-1"
                    placeholder="Label (contoh: Laminasi)"
                    value={field.label}
                    onChange={(e) => {
                    const label = e.target.value
                    updateField(index, "label", label)
                    updateField(index, "name", generateName(label))
                    }}
                />

                {/* TYPE */}
                <Select
                    value={field.type}
                    onValueChange={(val) =>
                    updateField(index, "type", val)
                    }
                >
                    <SelectTrigger className="w-32">
                    <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="select">Dropdown</SelectItem>
                    </SelectContent>
                </Select>

                {/* 🔥 TOMBOL HAPUS ICON */}
                <Button
                    type="button"
                    onClick={() => removeField(index)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3"
                    >
                    <Trash2 className="w-4 h-4" />
                </Button>

                </div>

                {/* 🔥 OPTIONS DI BAWAH */}
                {field.type === "select" && (
                <Input
                    className="w-full"
                    placeholder="Options (pisahkan dengan koma: Doff, Glossy, dll)"
                    value={field.options?.join(",") || ""}
                    onChange={(e) =>
                    updateField(
                        index,
                        "options",
                        e.target.value.split(",").map((opt) => opt.trim())
                    )
                    }
                />
                )}

            </div>
            ))}

            <Button variant="outline" className="w-full" onClick={addField}>
                + Tambah Field
            </Button>
            </div>

          {/* Button */}
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {loading ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}