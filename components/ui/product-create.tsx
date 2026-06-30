"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Layers, X } from "lucide-react"

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
    category_id: "", 
    is_custom: false, // 👈 1. TAMBAHKAN STATE BARU
  })

  const [photo, setPhoto] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [fields, setFields] = useState<CustomField[]>([])
  const [attributes, setAttributes] = useState<ProductAttribute[]>([])

  // ==========================================
  // 🔥 STATE UNTUK LOGIKA SEARCH & CREATE KATEGORI
  // ==========================================
  const [categories, setCategories] = useState<any[]>([])
  const [categorySearch, setCategorySearch] = useState("")
  const [filteredCategories, setFilteredCategories] = useState<any[]>([])
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false)

  type CustomField = {
    name: string
    label: string
    type: string
    options?: string[] 
  }

  type ProductAttribute = {
    name: string
    values: {
      name: string
      additional_price: number
    }[]
  }

  // Ambil data kategori saat modal dibuka
  useEffect(() => {
    if (open) {
      const fetchCategories = async () => {
        try {
          const token = localStorage.getItem("token")
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api"}/categories`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
          if (res.ok) {
            const data = await res.json()
            setCategories(data)
          }
        } catch (err) {
          console.error("Gagal mengambil data kategori:", err)
        }
      }
      fetchCategories()
    }
  }, [open])

  const generateName = (label: string) => {
    return label
        .toLowerCase()
        .replace(/\s+/g, "_") 
        .replace(/[^a-z0-9_]/g, "") 
  }

  const addField = () => {
    setFields([...fields, { name: "", label: "", type: "text", options: [] }])
  }

  const updateField = (index: number, key: string, value: any) => {
    const newFields = [...fields]
    newFields[index][key as keyof CustomField] = value
    setFields(newFields)
  }

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index))
  }

  const addAttribute = () => {
    setAttributes([...attributes, { name: "", values: [{ name: "", additional_price: 0 }] }])
  }

  const updateAttribute = (attrIndex: number, key: string, value: any) => {
    const newAttributes = [...attributes]
    newAttributes[attrIndex][key as keyof ProductAttribute] = value
    setAttributes(newAttributes)
  }

  const removeAttribute = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index))
  }

  const addAttributeValue = (attrIndex: number) => {
    const newAttributes = [...attributes]
    newAttributes[attrIndex].values.push({ name: "", additional_price: 0 })
    setAttributes(newAttributes)
  }

  const updateAttributeValue = (attrIndex: number, valueIndex: number, key: string, value: any) => {
    const newAttributes = [...attributes]
    newAttributes[attrIndex].values[valueIndex] = {
      ...newAttributes[attrIndex].values[valueIndex],
      [key]: value,
    }
    setAttributes(newAttributes)
  }

  const removeAttributeValue = (attrIndex: number, valueIndex: number) => {
    const newAttributes = [...attributes]
    newAttributes[attrIndex].values = newAttributes[attrIndex].values.filter((_, i) => i !== valueIndex)
    setAttributes(newAttributes)
  }

  // Mendapatkan objek kategori yang sedang dipilih secara aktif
  const selectedCategoryObj = categories.find((c) => String(c.id) === String(form.category_id))

  const handleSubmit = async () => {
    if (!form.category_id) {
      return alert("Pilih kategori produk terlebih dahulu")
    }

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append("name", form.name)
      formData.append("price", form.price)
      formData.append("estimated_duration", form.estimated_duration)
      formData.append("status", form.status)
      formData.append("category_id", form.category_id) 

      const isCustomValue = form.is_custom === true || String(form.is_custom) === "true" ? "1" : "0";
      formData.append("is_custom", isCustomValue)

      const sanitizedFields = fields.map(f => ({
        name: f.name || "",
        label: f.label || "",
        type: f.type || "text",
        options: Array.isArray(f.options) ? f.options : [] // Pastikan selalu array mutlak
      }))
      formData.append("fields", JSON.stringify(sanitizedFields))

      const sanitizedAttributes = attributes.map(a => ({
        name: a.name || "",
        values: Array.isArray(a.values) 
          ? a.values.map(v => ({ name: v.name || "", additional_price: Number(v.additional_price || 0) }))
          : []
      }))
      formData.append("attributes", JSON.stringify(sanitizedAttributes))

      if (photo) {
        formData.append("photo", photo)
      }

      const token = localStorage.getItem("token")

      await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api"}/products`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          Authorization: `Bearer ${token}`, 
        },
        body: formData,
      })
      

      onSuccess()
      onClose()

      // 3. RESET STATE SETELAH BERHASIL
      setForm({ name: "", price: "", estimated_duration: "", status: "1", category_id: "", is_custom: false })
      setPhoto(null)
      setFields([])
      setAttributes([])
      setCategorySearch("")
      setFilteredCategories([])
      setShowNewCategoryForm(false)
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
          <DialogDescription className="hidden">
            Formulir pembuatan produk baru beserta spesifikasinya.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">

          {/* Nama Produk */}
          <div>
            <Label>Nama Produk</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          {/* LOGIKA DROPDOWN SEARCH & QUICK CREATE KATEGORI BARU */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-gray-400" /> Kategori Produk
            </Label>
            
            <div className="relative">
              <Input
                placeholder="Cari atau ketik kategori baru..."
                value={categorySearch}
                onChange={(e) => {
                  const value = e.target.value
                  setCategorySearch(value)

                  if (!value) {
                    setFilteredCategories([])
                    setShowNewCategoryForm(false)
                    return
                  }

                  const results = categories.filter((c) =>
                    c.name?.toLowerCase().includes(value.toLowerCase())
                  )

                  setFilteredCategories(results)

                  if (results.length === 0) {
                    setShowNewCategoryForm(true)
                  } else {
                    setShowNewCategoryForm(false)
                  }
                }}
                className="bg-gray-50"
              />

              {/* Box Dropdown Hasil Pencarian */}
              {filteredCategories.length > 0 && (
                <div className="absolute z-50 mt-2 w-full bg-white border rounded-lg shadow-lg max-h-52 overflow-y-auto">
                  {filteredCategories.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setForm({ ...form, category_id: String(item.id) })
                        setCategorySearch("")
                        setFilteredCategories([])
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b text-sm font-medium"
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tampilan Badge Kategori Terpilih */}
            {form.category_id && selectedCategoryObj && (
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-blue-700">{selectedCategoryObj.name}</p>
                  <p className="text-xs text-blue-500">ID Kategori: #{selectedCategoryObj.id}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setForm({ ...form, category_id: "" })}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Form Cepat Tambah Kategori Baru */}
            {showNewCategoryForm && !form.category_id && (
              <div className="border rounded-xl p-4 space-y-3 bg-orange-50 border-orange-200">
                <p className="text-sm font-semibold text-orange-700">
                  Kategori "{categorySearch}" belum terdaftar
                </p>
                <Button
                  type="button"
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem("token")
                      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api"}/categories`, {
                        method: "POST",
                        headers: {
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                          name: categorySearch,
                          slug: generateName(categorySearch)
                        }),
                      })

                      if (res.ok) {
                        const createdCategory = await res.json()
                        setCategories([...categories, createdCategory])
                        setForm({ ...form, category_id: String(createdCategory.id) })
                        setShowNewCategoryForm(false)
                        setCategorySearch("")
                      }
                    } catch (err) {
                      console.error("Gagal menyimpan kategori baru:", err)
                    }
                  }}
                >
                  + Daftarkan Kategori "{categorySearch}"
                </Button>
              </div>
            )}
          </div>

          {/* 👇 4. INPUT BARU: PILIHAN TIPE PERHITUNGAN HARGA PRODUK */}
          <div>
            <Label>Tipe Perhitungan Harga</Label>
            <Select
              value={form.is_custom ? "1" : "0"}
              onValueChange={(val) => setForm({ ...form, is_custom: val === "1" })}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Pilih tipe produk..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Produk Standar (Dihitung Per Pcs / Paket)</SelectItem>
                <SelectItem value="1">Produk Kustom Meteran (Dihitung Luas P x L)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Harga dasar */}
          <div>
            <Label>Harga dasar</Label>
            <Input
              type="number"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              onWheel={(e) => e.currentTarget.blur()}
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          {/* Estimasi */}
          <div>
            <Label>Estimasi (hari)</Label>
            <Input
              type="number"
              value={form.estimated_duration}
              onChange={(e) => setForm({ ...form, estimated_duration: e.target.value })}
              onWheel={(e) => e.currentTarget.blur()}
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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

          {/* Custom Fields */}
          <div className="space-y-3">
            <Label>Custom Fields</Label>
            {fields.map((field, index) => (
              <div key={index} className="border rounded-lg p-3 space-y-3 bg-gray-50">
                <div className="flex items-center gap-2">
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
                  <Select
                    value={field.type}
                    onValueChange={(val) => updateField(index, "type", val)}
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
                  <Button
                    type="button"
                    onClick={() => removeField(index)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                {field.type === "select" && (
                  <Input
                    className="w-full"
                    placeholder="Options (pisahkan dengan koma: Doff, Glossy, dll)"
                    value={field.options?.join(",") || ""}
                    onChange={(e) =>
                      updateField(index, "options", e.target.value.split(",").map((opt) => opt.trim()))
                    }
                  />
                )}
              </div>
            ))}
            <Button variant="outline" className="w-full" onClick={addField}>
                + Tambah Field
            </Button>
          </div>

          {/* Atribut Produk */}
          <div className="space-y-4">
            <Label>Atribut Produk</Label>
            {attributes.map((attribute, attrIndex) => (
              <div key={attrIndex} className="border rounded-lg p-4 space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Nama Atribut (contoh: Bahan)"
                    value={attribute.name}
                    onChange={(e) => updateAttribute(attrIndex, "name", e.target.value)}
                  />
                  <Button type="button" variant="destructive" onClick={() => removeAttribute(attrIndex)}>
                    Hapus
                  </Button>
                </div>
                {attribute.values.map((value, valueIndex) => (
                  <div key={valueIndex} className="flex gap-2">
                    <Input
                      placeholder="Nama Value"
                      value={value.name}
                      onChange={(e) => updateAttributeValue(attrIndex, valueIndex, "name", e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Harga Tambahan"
                      value={value.additional_price === 0 ? "" : value.additional_price}
                      onChange={(e) =>
                        updateAttributeValue(attrIndex, valueIndex, "additional_price", Number(e.target.value))
                      }
                       onWheel={(e) => e.currentTarget.blur()}
                       className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <Button type="button" variant="destructive" onClick={() => removeAttributeValue(attrIndex, valueIndex)}>
                      X
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => addAttributeValue(attrIndex)}>
                  + Tambah Value
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addAttribute}>
              + Tambah Atribut
            </Button>
          </div>

          {/* Button Simpan */}
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {loading ? "Menyimpan..." : "Simpan Produk"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}