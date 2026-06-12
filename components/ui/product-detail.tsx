"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Props {
  open: boolean
  onClose: () => void
  product: any
  onSuccess?: (updated: any) => void
}

export default function ProductDetailModal({ open, onClose, product, onSuccess }: Props) {
  const productId = `PR${String(product?.id ?? 0).padStart(2, "0")}`
  const [isEdit, setIsEdit] = useState(false)
  const [formData, setFormData] = useState<any>({})
  
  // State untuk menampung master kategori dari database
  const [categories, setCategories] = useState<any[]>([])

  // Ambil data kategori saat modal dibuka
  useEffect(() => {
    if (open) {
      const fetchCategories = async () => {
        try {
          const token = localStorage.getItem("token")
          const res = await fetch("http://127.0.0.1:8000/api/categories", {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (res.ok) {
            const data = await res.json()
            setCategories(data)
          }
        } catch (err) {
          console.error("Gagal memuat kategori:", err)
        }
      }
      fetchCategories()
    }
  }, [open])

  const handleEdit = () => {
    setIsEdit(true)
    setFormData({
        name: product.name,
        price: product.price,
        estimated_duration: product.estimated_duration,
        description: product.description,
        status: product.status,
        category_id: String(product.category_id || ""), 
        is_custom: product.is_custom ? 1 : 0, // 👈 1. Inisialisasi nilai is_custom saat tombol edit diklik
        attributes: product.attributes || []
    })
  }

  useEffect(() => {
    if (product) {
      setFormData({})
      setIsEdit(false)
    }
  }, [product])

  const handleSubmit = async () => {
    try {
      const form = new FormData()

      form.append("name", formData.name)
      form.append("price", formData.price)
      form.append("estimated_duration", formData.estimated_duration)
      form.append("description", formData.description || "")
      form.append("status", formData.status)
      form.append("category_id", formData.category_id) 
      form.append("is_custom", formData.is_custom == 1 ? "1" : "0") // 👈 2. Kirim status is_custom baru ke Laravel
      form.append("attributes", JSON.stringify(formData.attributes || []))
      form.append("_method", "PUT")

      if (formData.photo instanceof File) {
        form.append("photo", formData.photo)
      }

      const token = localStorage.getItem("token")

      const res = await fetch(`http://127.0.0.1:8000/api/products/${product.id}`, {
        method: "POST", // Tetap POST karena membawa file + _method PUT
        headers: {
          Authorization: `Bearer ${token}`, 
        },
        body: form,
      })

      const json = await res.json()
      const updated = json.data

      setIsEdit(false)
      onSuccess?.(updated)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="p-0 max-w-5xl w-full h-[80vh] overflow-hidden rounded-2xl border-0 shadow-2xl bg-white">
        <DialogTitle className="sr-only">Detail Produk</DialogTitle>
        
        <div className="bg-[#f5f6fa] p-6 h-full overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">

            {/* Heading + Action Buttons */}
            <div className="flex items-start justify-between px-8 pt-7 pb-5">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Detail Produk</h1>
              </div>
              <div className="flex items-center gap-3">
                {!isEdit ? (
                  <button onClick={handleEdit} className="px-5 py-2 rounded-lg bg-indigo-600 text-sm text-white">
                    Edit Produk
                  </button>
                ) : (
                  <>
                    <button onClick={() => setIsEdit(false)} className="px-5 py-2 rounded-lg border text-sm">
                      Batal
                    </button>
                    <button onClick={handleSubmit} className="px-5 py-2 rounded-lg bg-green-600 text-sm text-white">
                      Simpan
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="border-t border-gray-100 mx-8" />

            {product && (
              <div className="flex gap-6 p-8">

                {/* ── LEFT COLUMN: Thumbnail + Status + Details ── */}
                <div className="w-64 shrink-0 flex flex-col gap-4">
                  <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Thumbnail</p>
                    <div className="relative">
                      <img
                        src={
                          formData?.previewPhoto
                            ? formData.previewPhoto
                            : product.photo
                            ? product.photo.startsWith("http")
                              ? product.photo
                              : `http://127.0.0.1:8000/storage/${product.photo}`
                            : "/placeholder.png"
                        }
                        className="w-full h-44 object-cover rounded-lg"
                      />
                      {isEdit && (
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              const preview = URL.createObjectURL(file)
                              setFormData((prev: any) => ({
                                ...prev,
                                photo: file,
                                previewPhoto: preview,
                              }))
                            }
                          }}
                          className="mt-2 text-sm"
                        />
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
                    {isEdit ? (
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: Number(e.target.value) })}
                        className="border rounded-lg px-3 py-2 text-sm w-full bg-white"
                      >
                        <option value={1}>Aktif</option>
                        <option value={0}>Tidak Aktif</option>
                      </select>
                    ) : (
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${product.status ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"}`}>
                        <span className={`w-2 h-2 rounded-full ${product.status ? "bg-green-500" : "bg-red-500"}`} />
                        {product.status ? "Aktif" : "Tidak Aktif"}
                      </div>
                    )}
                  </div>

                  {/* Product Details Mini Card */}
                  <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Detail Identitas</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-xs text-gray-400">ID Produk</span>
                        <span className="text-xs font-semibold text-gray-700">{productId}</span>
                      </div>
                      <div className="border-t border-dashed border-gray-100" />
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-xs text-gray-400">Estimasi</span>
                        {isEdit ? (
                          <input
                            type="number"
                            className="border rounded px-2 py-1 text-xs w-20"
                            value={formData.estimated_duration}
                            onChange={(e) => setFormData({ ...formData, estimated_duration: e.target.value })}
                          />
                        ) : (
                          <span className="text-xs font-semibold text-gray-700">{product.estimated_duration} Hari</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── RIGHT COLUMN: General + Pricing + Attributes ── */}
                <div className="flex-1 flex flex-col gap-5">

                  {/* General Section */}
                  <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-4">
                    
                    {/* Nama Produk */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Nama Produk</label>
                      {isEdit ? (
                        <input
                          className="border rounded p-2 w-full text-sm"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                      ) : (
                        <p className="text-sm font-semibold text-gray-800">{product.name}</p>
                      )}
                    </div>

                    {/* KATEGORI PRODUK */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Kategori Produk</label>
                      {isEdit ? (
                        <Select
                          value={formData.category_id}
                          onValueChange={(val) => setFormData({ ...formData, category_id: val })}
                        >
                          <SelectTrigger className="w-full bg-white">
                            <SelectValue placeholder="Pilih Kategori" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={String(cat.id)}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg w-fit">
                          {product.category?.name || "Tanpa Kategori"}
                        </p>
                      )}
                    </div>

                    {/* 👈 3. INPUT BARU: TIPE PERHITUNGAN HARGA (is_custom) */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Tipe Perhitungan Harga</label>
                      {isEdit ? (
                        <select
                          value={formData.is_custom}
                          onChange={(e) => setFormData({ ...formData, is_custom: Number(e.target.value) })}
                          className="border rounded-lg px-3 py-2 text-sm w-full bg-white"
                        >
                          <option value={0}>Produk Standar (Dihitung Per Pcs / Paket)</option>
                          <option value={1}>Produk Kustom Meteran (Dihitung Luas P x L)</option>
                        </select>
                      ) : (
                        <p className={`text-sm font-semibold px-3 py-1.5 rounded-lg w-fit ${product.is_custom ? "bg-purple-50 text-purple-600" : "bg-orange-50 text-orange-600"}`}>
                          {product.is_custom ? "Produk Kustom Meteran (Luas P x L)" : "Produk Standar (Per Pcs / Paket)"}
                        </p>
                      )}
                    </div>

                    {/* Deskripsi */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Deskripsi</label>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        {isEdit ? (
                          <textarea
                            className="w-full p-3 text-sm border-0 focus:outline-none"
                            placeholder="Masukkan deskripsi..."
                            value={formData.description || ""}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          />
                        ) : (
                          <div className="px-3 py-3 min-h-[72px] text-sm text-gray-600 bg-white">
                            {product.description || <span className="text-gray-300 italic">Tidak ada deskripsi</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pricing Section */}
                  <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Harga Dasar</label>
                    {isEdit ? (
                      <input
                        type="number"
                        className="border rounded p-2 w-full text-sm"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      />
                    ) : (
                      <p className="text-sm font-bold text-gray-950">
                        Rp {Number(product.price).toLocaleString("id-ID")}
                      </p>
                    )}
                  </div>

                  {/* Product Attributes */}
                  <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                    <p className="text-sm font-bold text-gray-800 mb-4">Atribut Produk</p>
                    {(isEdit ? formData.attributes : product.attributes)?.length ? (
                      <div className="space-y-4">
                        {(isEdit ? formData.attributes : product.attributes).map((attribute: any, attrIndex: number) => (
                          <div key={attrIndex} className="border rounded-lg p-3">
                            {isEdit ? (
                              <input
                                className="border rounded p-2 w-full mb-3"
                                value={attribute.name}
                                onChange={(e) => {
                                  const attrs = [...formData.attributes]
                                  attrs[attrIndex].name = e.target.value
                                  setFormData({ ...formData, attributes: attrs })
                                }}
                              />
                            ) : (
                              <p className="font-semibold">{attribute.name}</p>
                            )}

                            <div className="mt-2 space-y-2">
                              {attribute.values?.map((value: any, valueIndex: number) => (
                                <div key={valueIndex} className="flex gap-2 items-center">
                                  {isEdit ? (
                                    <>
                                      <input
                                        className="border rounded p-2 flex-1"
                                        value={value.name}
                                        onChange={(e) => {
                                          const attrs = [...formData.attributes]
                                          attrs[attrIndex].values[valueIndex].name = e.target.value
                                          setFormData({ ...formData, attributes: attrs })
                                        }}
                                      />
                                      <input
                                        type="number"
                                        className="border rounded p-2 w-36"
                                        value={value.additional_price}
                                        onChange={(e) => {
                                          const attrs = [...formData.attributes]
                                          attrs[attrIndex].values[valueIndex].additional_price = Number(e.target.value)
                                          setFormData({ ...formData, attributes: attrs })
                                        }}
                                      />
                                      <button
                                        type="button"
                                        className="px-3 py-2 bg-red-500 text-white rounded"
                                        onClick={() => {
                                          const attrs = [...formData.attributes]
                                          attrs[attrIndex].values.splice(valueIndex, 1)
                                          setFormData({ ...formData, attributes: attrs })
                                        }}
                                      >
                                        X
                                      </button>
                                    </>
                                  ) : (
                                    <div className="flex justify-between border rounded p-2 w-full bg-gray-50 text-xs">
                                      <span>{value.name}</span>
                                      <span>Rp {Number(value.additional_price).toLocaleString("id-ID")}</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>

                            {isEdit && (
                              <button
                                type="button"
                                className="mt-3 px-3 py-1.5 border text-xs rounded bg-white"
                                onClick={() => {
                                  const attrs = [...formData.attributes]
                                  attrs[attrIndex].values.push({ name: "", additional_price: 0 })
                                  setFormData({ ...formData, attributes: attrs })
                                }}
                              >
                                + Tambah Value
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-xs">Tidak ada atribut</p>
                    )}
                  </div>

                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}