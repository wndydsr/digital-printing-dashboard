"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2 } from "lucide-react" // 🛠️ Tambahkan icon Trash untuk hapus atribut baru

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
  const [categories, setCategories] = useState<any[]>([])

  useEffect(() => {
    if (open) {
      const fetchCategories = async () => {
        try {
          const token = localStorage.getItem("token")
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api"}/categories`, {
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
    // 🛠️ Pastikan kita melakukan deep copy pada attributes agar manipulasi array aman
    const deepCloneAttributes = product.attributes 
      ? JSON.parse(JSON.stringify(product.attributes)) 
      : [];

    setFormData({
        name: product.name,
        price: product.price,
        estimated_duration: product.estimated_duration,
        description: product.description,
        status: product.status,
        category_id: String(product.category_id || ""), 
        is_custom: product.is_custom ? 1 : 0,
        attributes: deepCloneAttributes
    })
  }

  // 🛠️ FUNGSI BARU: MENAMBAHKAN INDUK ATRIBUT BARU
  const handleAddAttribute = () => {
    const currentAttrs = [...(formData.attributes || [])]
    setFormData({
      ...formData,
      attributes: [
        ...currentAttrs,
        { name: "", values: [{ name: "", additional_price: 0 }] } // Format standar atribut baru
      ]
    })
  }

  // 🛠️ FUNGSI BARU: MENGHAPUS INDUK ATRIBUT
  const handleRemoveAttribute = (attrIndex: number) => {
    const currentAttrs = [...formData.attributes]
    const updatedAttrs = currentAttrs.filter((_, i) => i !== attrIndex)
    setFormData({ ...formData, attributes: updatedAttrs })
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
      form.append("is_custom", formData.is_custom == 1 ? "1" : "0")
      
      // 🛠️ Kirim header Accept agar data validasi Laravel terbaca sebagai JSON
      const token = localStorage.getItem("token")
      
      // Bersihkan muatan data attributes dari spasi / string kosong ilegal sebelum dikirim ke Laravel
      const sanitizedAttributes = (formData.attributes || []).map((a: any) => ({
        name: a.name || "",
        values: Array.isArray(a.values) 
          ? a.values.map((v: any) => ({ name: v.name || "", additional_price: Number(v.additional_price || 0) }))
          : []
      }))

      form.append("attributes", JSON.stringify(sanitizedAttributes))
      form.append("_method", "PUT")

      if (formData.photo instanceof File) {
        form.append("photo", formData.photo)
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api"}/products/${product.id}`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          Authorization: `Bearer ${token}`, 
        },
        body: form,
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        alert(`Gagal update: ${errorData.message || "Periksa kembali data form anda."}`)
        return
      }

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
                  <button onClick={handleEdit} className="px-5 py-2 rounded-lg bg-indigo-600 text-sm text-white font-medium hover:bg-indigo-700 transition-all">
                    Edit Produk
                  </button>
                ) : (
                  <>
                    <button onClick={() => setIsEdit(false)} className="px-5 py-2 rounded-lg border text-sm font-medium hover:bg-slate-50">
                      Batal
                    </button>
                    <button onClick={handleSubmit} className="px-5 py-2 rounded-lg bg-green-600 text-sm text-white font-medium hover:bg-green-700 transition-all">
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
                              : (() => {
                              const baseUrl = "https://api.prinora.store";

                              const cleanPath = product.photo
                                .replace(/^public\//, '')
                                .replace(/^storage\//, '');

                              return `${baseUrl}/storage/${cleanPath}`;
                                })()
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
                          className="mt-2 text-sm w-full text-gray-500"
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
                        className="border rounded-lg px-3 py-2 text-sm w-full bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
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
                            className="border rounded px-2 py-1 text-xs w-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            value={formData.estimated_duration}
                            onWheel={(e) => e.currentTarget.blur()}
                            onChange={(e) => {
                              const cleanValue = e.target.value.replace(/^0+(?=\d)/, '');
                              setFormData({ ...formData, estimated_duration: cleanValue })
                            }}
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
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Nama Produk</label>
                      {isEdit ? (
                        <input
                          className="border rounded p-2 w-full text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
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

                    {/* TIPE PERHITUNGAN HARGA (is_custom) */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Tipe Perhitungan Harga</label>
                      {isEdit ? (
                        <select
                          value={formData.is_custom}
                          onChange={(e) => setFormData({ ...formData, is_custom: Number(e.target.value) })}
                          className="border rounded-lg px-3 py-2 text-sm w-full bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
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
                            className="w-full p-3 text-sm border-0 focus:outline-none min-h-[80px]"
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
                        className="border rounded p-2 w-full text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={formData.price}
                        onChange={(e) => {
                          const cleanValue = e.target.value.replace(/^0+(?=\d)/, '');
                          setFormData({ ...formData, price: cleanValue });
                        }}
                        onWheel={(e) => e.currentTarget.blur()}
                      />
                    ) : (
                      <p className="text-sm font-bold text-gray-950">
                        Rp {Number(product.price).toLocaleString("id-ID")}
                      </p>
                    )}
                  </div>

                  {/* Product Attributes */}
                  <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-4">
                    <p className="text-sm font-bold text-gray-800">Atribut Produk</p>
                    
                    {(isEdit ? formData.attributes : product.attributes)?.length ? (
                      <div className="space-y-4">
                        {(isEdit ? formData.attributes : product.attributes).map((attribute: any, attrIndex: number) => (
                          <div key={attrIndex} className="border border-slate-200 rounded-xl p-4 bg-slate-50/30 relative">
                            
                            {/* 🛠️ TOMBOL HAPUS INDUK ATRIBUT (Hanya muncul saat mode edit) */}
                            {isEdit && (
                              <button
                                type="button"
                                onClick={() => handleRemoveAttribute(attrIndex)}
                                className="absolute top-3 right-3 text-red-500 hover:text-red-700 text-xs font-medium flex items-center gap-1 bg-white border px-2 py-1 rounded-md shadow-sm"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Hapus Atribut
                              </button>
                            )}

                            <div>
                              {isEdit ? (
                                <div className="max-w-xs mb-3">
                                  <label className="block text-[10px] text-gray-400 mb-1 font-semibold">Nama Atribut</label>
                                  <input
                                    className="border rounded p-2 w-full text-sm bg-white"
                                    placeholder="Contoh: Bahan, Ukuran"
                                    value={attribute.name}
                                    onChange={(e) => {
                                      const attrs = [...formData.attributes]
                                      attrs[attrIndex].name = e.target.value
                                      setFormData({ ...formData, attributes: attrs })
                                    }}
                                  />
                                </div>
                              ) : (
                                <p className="font-semibold text-sm text-gray-700">{attribute.name}</p>
                              )}
                            </div>

                            <div className="mt-2 space-y-2">
                              {attribute.values?.map((value: any, valueIndex: number) => (
                                <div key={valueIndex} className="flex gap-2 items-center">
                                  {isEdit ? (
                                    <>
                                      <input
                                        className="border rounded p-2 flex-1 text-sm bg-white"
                                        placeholder="Nama Value (Doff / Glossy)"
                                        value={value.name}
                                        onChange={(e) => {
                                          const attrs = [...formData.attributes]
                                          attrs[attrIndex].values[valueIndex].name = e.target.value
                                          setFormData({ ...formData, attributes: attrs })
                                        }}
                                      />
                                      <input
                                        type="number"
                                        placeholder="Harga Tambahan"
                                        className="border rounded p-2 w-36 text-sm bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        value={value.additional_price === 0 ? "" : value.additional_price}
                                        onWheel={(e) => e.currentTarget.blur()}
                                        onChange={(e) => {
                                          const cleanValue = e.target.value.replace(/^0+(?=\d)/, '');
                                          const numericValue = cleanValue === "" ? 0 : Number(cleanValue);
                                          const attrs = [...formData.attributes]
                                          attrs[attrIndex].values[valueIndex].additional_price = numericValue
                                          setFormData({ ...formData, attributes: attrs })
                                        }}
                                      />
                                      <button
                                        type="button"
                                        className="px-3 py-2 bg-red-100 text-red-600 hover:bg-red-200 text-sm rounded-lg font-bold"
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
                                    <div className="flex justify-between border rounded-lg p-2.5 w-full bg-gray-50 text-xs font-medium">
                                      <span className="text-gray-600">{value.name}</span>
                                      <span className="text-indigo-600 font-bold">Rp {Number(value.additional_price).toLocaleString("id-ID")}</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>

                            {isEdit && (
                              <button
                                type="button"
                                className="mt-3 px-3 py-1.5 border text-xs font-bold rounded-lg bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm"
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
                      // Tampilan fallback jika data kosong
                      !isEdit && <p className="text-gray-400 text-xs italic">Tidak ada atribut khusus pada produk ini</p>
                    )}

                    {/* 🛠️ TOMBOL UTAMA BARU: UNTUK MENAMBAH INDUK ATRIBUT BARU */}
                    {isEdit && (
                      <button
                        type="button"
                        onClick={handleAddAttribute}
                        className="w-full py-2.5 border-2 border-dashed border-indigo-200 text-indigo-600 font-bold text-xs rounded-xl bg-indigo-50/40 hover:bg-indigo-50 transition-all"
                      >
                        + Tambah Kategori Atribut Baru
                      </button>
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