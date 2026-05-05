"use client"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"
import { useEffect } from "react"

interface Props {
  open: boolean
  onClose: () => void
  product: any
  onSuccess?: (updated: any) => void
}


export default function ProductDetailModal({ open, onClose, product, onSuccess }: Props) {
  const parsedFields = (() => {
    try {
      if (typeof product?.fields === "string") {
        return JSON.parse(product.fields)
      }
      return product?.fields || []
    } catch {
      return []
    }
  })()

  const productId = `PR${String(product?.id ?? 0).padStart(2, "0")}`
  const [openEdit, setOpenEdit] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [formData, setFormData] = useState<any>({})

  const handleEdit = () => {
    setIsEdit(true)
    setFormData({
        name: product.name,
        price: product.price,
        estimated_duration: product.estimated_duration,
        description: product.description,
        status: product.status,
        fields: parsedFields,
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
        form.append("fields", JSON.stringify(formData.fields))
        form.append("_method", "PUT")

        // 🔥 ini buat foto
        if (formData.photo instanceof File) {
          form.append("photo", formData.photo)
        }

        const token = localStorage.getItem("token")

        const res = await fetch(`http://127.0.0.1:8000/api/products/${product.id}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`, // 🔥 WAJIB
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
      {/* Suppress default DialogContent padding/rounding to take full control */}
      <DialogContent className="p-0 max-w-5xl w-full h-[80vh] overflow-hidden rounded-2xl border-0 shadow-2xl bg-white">

        <DialogTitle className="sr-only">
            Detail Produk
        </DialogTitle>
        
        {/* ── MAIN CONTENT CARD ── */}
        <div className="bg-[#f5f6fa] p-6 h-full overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">

            {/* Page heading + action buttons */}
            <div className="flex items-start justify-between px-8 pt-7 pb-5">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Detail Produk</h1>
              </div>
              <div className="flex items-center gap-3">
                {!isEdit ? (
                <button
                    onClick={handleEdit}
                    className="px-5 py-2 rounded-lg bg-indigo-600 text-sm text-white"
                >
                    Edit Produk
                </button>
                ) : (
                <>
                    <button
                    onClick={() => setIsEdit(false)}
                    className="px-5 py-2 rounded-lg border text-sm"
                    >
                    Batal
                    </button>

                    <button
                    onClick={handleSubmit}
                    className="px-5 py-2 rounded-lg bg-green-600 text-sm text-white"
                    >
                    Simpan
                    </button>
                </>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 mx-8" />

            {product && (
              <div className="flex gap-6 p-8">

                {/* ── LEFT COLUMN: Thumbnail + Status + Details ── */}
                <div className="w-64 shrink-0 flex flex-col gap-4">

                  {/* Thumbnail card */}
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

                  {/* Status card */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                        Status
                    </label>

                    {isEdit ? (
                        <select
                        value={formData.status}
                        onChange={(e) =>
                            setFormData({
                            ...formData,
                            status: Number(e.target.value),
                            })
                        }
                        className="border rounded-lg px-3 py-2 text-sm"
                        >
                        <option value={1}>Aktif</option>
                        <option value={0}>Tidak Aktif</option>
                        </select>
                    ) : (
                        <div
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                            product.status
                            ? "bg-green-100 text-green-600"
                            : "bg-red-100 text-red-500"
                        }`}
                        >
                        <span
                            className={`w-2 h-2 rounded-full ${
                            product.status ? "bg-green-500" : "bg-red-500"
                            }`}
                        />
                        {product.status ? "Aktif" : "Tidak Aktif"}
                        </div>
                    )}
                    </div>

                  {/* Product Details mini card */}
                  <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Detail Produk</p>
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
                            onChange={(e) =>
                            setFormData({
                                ...formData,
                                estimated_duration: e.target.value,
                            })
                            }
                        />
                        ) : (
                        <span className="text-xs font-semibold text-gray-700">
                            {product.estimated_duration} Hari
                        </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── RIGHT COLUMN: General + Pricing + Custom Fields ── */}
                <div className="flex-1 flex flex-col gap-5">

                  {/* General section */}
                  <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                    <div className="border-b border-gray-100 mb-4" />

                    {/* Product Name */}
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Nama Produk</label>
                      {isEdit ? (
                        <input
                            className="border rounded p-2 w-full"
                            value={formData.name}
                            onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                            }
                        />
                        ) : (
                        <p className="text-sm font-semibold text-gray-800">
                            {product.name}
                        </p>
                        )}
                    </div>

                    {/* Description (custom fields used as description here) */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Deskripsi</label>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">                    
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          {isEdit ? (
                            <textarea
                              className="w-full p-3 text-sm border-0 focus:outline-none"
                              placeholder="Masukkan deskripsi..."
                              value={formData.description || ""}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  description: e.target.value,
                                })
                              }
                            />
                          ) : (
                            <div className="px-3 py-3 min-h-[72px] text-sm text-gray-600 bg-white">
                              {product.description || (
                                <span className="text-gray-300 italic">Tidak ada deskripsi</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pricing section */}
                  <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Harga Dasar</label>
                      {isEdit ? (
                        <input
                            type="number"
                            className="border rounded p-2 w-full"
                            value={formData.price}
                            onChange={(e) =>
                            setFormData({ ...formData, price: e.target.value })
                            }
                        />
                        ) : (
                        <p className="text-sm font-semibold text-gray-900">
                            Rp {Number(product.price).toLocaleString("id-ID")}
                        </p>
                        )}
                    </div>
                  </div>

                  {/* Custom Fields section */}
                  <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                    <p className="text-sm font-bold text-gray-800 mb-4">Custom Fields</p>
                    <div className="border-b border-gray-100 mb-4" />

                    {parsedFields.length ? (
                      <div className="grid grid-cols-2 gap-3">
                        {(isEdit ? formData.fields : parsedFields).map((f: any, i: number) => (
                          <div
                            key={i}
                            className="border border-gray-100 rounded-lg p-3 bg-gray-50 space-y-2"
                          >
                            {isEdit ? (
                            <>
                            {/* BARIS ATAS */}
                                <div className="grid grid-cols-2 gap-2"></div>

                            {/* LABEL */}
                            <input
                                className="border rounded p-2 text-sm w-full"
                                value={f.label}
                                onChange={(e) => {
                                    const newFields = [...formData.fields]
                                    newFields[i].label = e.target.value
                                    setFormData({ ...formData, fields: newFields })
                                }}
                            />

                            {/* TYPE */}
                            <select
                            className="border rounded p-2 text-sm w-full"
                            value={f.type}
                            onChange={(e) => {
                                const newFields = [...formData.fields]
                                newFields[i].type = e.target.value
                                setFormData({ ...formData, fields: newFields })
                            }}
                            >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="select">Dropdown</option>
                            </select>

                                 {/* 🔥 INI YANG KAMU TANYA */}
                            {f.type === "select" && (
                            <input
                                className="border rounded p-2 w-full text-sm"
                                placeholder="Options (pisahkan koma)"
                                value={f.options?.join(",") || ""}
                                onChange={(e) => {
                                const newFields = [...formData.fields]
                                newFields[i].options = e.target.value
                                    .split(",")
                                    .map((opt) => opt.trim())

                                setFormData({ ...formData, fields: newFields })
                                }}
                            />
                            )}
                        </>
                        ) : (
                        <>
                            {/* MODE VIEW */}
                            <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-700">
                                {f.label}
                            </span>
                            <Badge className="text-xs bg-indigo-50 text-indigo-600">
                                {f.type}
                            </Badge>
                            </div>

                            {f.type === "select" && (
                            <p className="text-xs text-gray-400">
                                {f.options?.join(", ")}
                            </p>
                            )}
                        </>
                        )}
                    </div>
                    ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Tidak ada custom field</p>
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