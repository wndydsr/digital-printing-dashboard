"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function OrderCreateModal({ open, onClose, onSuccess }: Props) {
  const [products, setProducts] = useState<any[]>([])
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [formData, setFormData] = useState<any>({})
  const [customers, setCustomers] = useState<any[]>([])
  const [isNewCustomer, setIsNewCustomer] = useState(false)

  const calculateTotal = () => {
  if (!selectedProduct) return 0

  const price = Number(selectedProduct.price) || 0
  const qty = Number(formData.qty) || 1

  // 🔥 Banner (pakai luas)
  if (selectedProduct.name.toLowerCase().includes("banner")) {
    const lebar = Number(formData.lebar) || 0
    const tinggi = Number(formData.tinggi) || 0

    const luas = (lebar / 100) * (tinggi / 100) // cm → meter
    return luas * price * qty
  }

  // 🔥 Default (kaos, dll)
  return price * qty
}
  const calculatedTotal = calculateTotal()
  
  useEffect(() => {
  if (!open) {
    setSelectedProduct(null)
    setFormData({})
    setIsNewCustomer(false)
  }
}, [open])

  const { 
    customer_id, 
    customer_name, 
    total_price, 
    order_date, 
    product_id,
    qty, // 🔥 TAMBAH INI
    ...customFields 
  } = formData

  // 🔥 fetch produk
  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(data))
  }, [])

  useEffect(() => {
  fetch("http://127.0.0.1:8000/api/customers")
    .then((res) => res.json())
    .then((data) => setCustomers(data))
}, [])

  // 🔥 handle input dynamic
  const handleChange = (name: string, value: any) => {
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  // 🔥 submit (sementara console dulu)
  const handleSubmit = async () => {
     try {
    let customerId = formData.customer_id

    // 🔥 kalau customer baru → create dulu
    if (isNewCustomer) {
  const res = await fetch("http://127.0.0.1:8000/api/customers/find-or-create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: formData.customer_name,
      phone: formData.customer_phone,
      email: formData.customer_email,
      address: formData.customer_address,
    }),
  })

  const customer = await res.json()
  customerId = customer.id
}

      const payload = {
        product_id: selectedProduct?.id,
        customer_id: customerId,// 🔥 WAJIB ADA
        current_stage_id: 1,       // 🔥 default: Butuh Desain
        created_by: 1,   
        order_date: formData.order_date,
        total_price: Math.round(calculatedTotal),
        qty: Number(formData.qty),
        notes: JSON.stringify(customFields),
      }

      const res = await fetch("http://127.0.0.1:8000/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      console.log("SUCCESS:", data)

      onSuccess()
      onClose()
    } catch (err) {
      console.error("ERROR:", err)
    }
  }

  const parsedFields = (() => {
  try {
      if (typeof selectedProduct?.fields === "string") {
        return JSON.parse(selectedProduct.fields)
      }
      return selectedProduct?.fields || []
    } catch {
      return []
    }
  })()

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl rounded-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Pesanan</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          
          {/* PILIH PRODUK */}
          <div>
            <label className="text-sm">Produk</label>
            <Select
              onValueChange={(value) => {
                const product = products.find((p) => p.id == value)
                setSelectedProduct(product)

                setFormData({
                   product_id: value 
                })
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih Produk" />
              </SelectTrigger>

              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 🔥 FORM DINAMIS */}
          {parsedFields.map((field: any, index: number) => (
            <div key={index}>
              <label className="text-sm">{field.label}</label>

              {field.type === "select" ? (
              <Select
                onValueChange={(value) =>
                  handleChange(field.name, value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Pilih ${field.label}`} />
                </SelectTrigger>

                <SelectContent>
                  {field.options?.map((opt: string, i: number) => (
                    <SelectItem key={i} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (

                      <Input
                        type={field.type}
                        placeholder={field.label}
                        value={formData[field.name] || ""}
                        onChange={(e) =>
                          handleChange(field.name, e.target.value)
                        }
                      />
                  )}
                    </div>
                  ))}

          {/* FIELD UMUM */}
          {selectedProduct && (
            <>
              <div>
                <label className="text-sm">Customer</label>

                <Select
                  onValueChange={(value) => {
                    if (value === "new") {
                      setIsNewCustomer(true)
                    } else {
                      setIsNewCustomer(false)
                      handleChange("customer_id", value)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Customer" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="new">+ Customer Baru</SelectItem>

                    {customers.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
                {isNewCustomer && (
                  <div className="space-y-2">
                    <Input
                      placeholder="Nama Customer"
                      onChange={(e) =>
                        handleChange("customer_name", e.target.value)
                      }
                    />
                    <Input
                      placeholder="Email"
                      onChange={(e) =>
                        handleChange("customer_email", e.target.value)
                      }
                    />
                    <Input
                      placeholder="No HP"
                      onChange={(e) =>
                        handleChange("customer_phone", e.target.value)
                      }
                    />
                    <Input
                      placeholder="Alamat"
                      onChange={(e) =>
                        handleChange("customer_address", e.target.value)
                      }
                    />
                  </div>
                )}

                <div>
                  <label className="text-sm">Jumlah</label>
                  <Input
                    type="number"
                    placeholder="Masukkan jumlah"
                    value={formData.qty || ""}
                    onChange={(e) => handleChange("qty", e.target.value)}
                  />
                </div>

              <div>
                <label className="text-sm">Total</label>
                <Input
                  type="number"
                  value={Math.round(calculatedTotal)}
                  readOnly
                />
              </div>

              <div>
                <label className="text-sm">Tanggal</label>
                <Input
                  type="date"
                  onChange={(e) =>
                    handleChange("order_date", e.target.value)
                  }
                />
              </div>

              <div>
                <label className="text-sm">File Desain</label>
                <Input
                  type="file"
                  onChange={(e) =>
                    handleChange("file", e.target.files?.[0])
                  }
                />
              </div>
            </>
          )}

          {/* ACTION */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Batal
            </Button>

            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleSubmit}
              disabled={!selectedProduct}
            >
              Simpan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}