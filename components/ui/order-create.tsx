"use client"

import { useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { 
  Plus, Search, Trash2, Check, Package, 
  UserSearch, CreditCard, Receipt, X 
} from "lucide-react"
import PaymentModal from "@/components/ui/payment-order"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { apiFetch } from "@/lib/api"
import { useEffect } from "react"

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function OrderCreateModal({ open, onClose, onSuccess }: Props) {
  const { toast } = useToast()
  
  // --- STATE ---
  const [phoneSearch, setPhoneSearch] = useState("")
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([])
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false)
  const [loading, setLoading] = useState(false)

  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  })

  // --- LOGIC: PRODUCTS ---
  const addProduct = () => {
    setProducts([
      ...products,
      {
        id: Date.now(),
        product_id: "",
        quantity: 1,
        catatan: "",
        need_design: false,
        design_files: [],
        support_files: [],
        fields: {},
      }
    ])
  }

  const getProduct = (id: string) => {
  const product = catalogProducts.find((p) => p.id == id)

    return {
      ...product,
      fields: normalizeFields(product?.fields),
    }
  }

  const updateDynamicField = (
    id: number,
    key: string,
    value: any
  ) => {
    setProducts(products.map((p) =>
      p.id === id
        ? {
            ...p,
            fields: {
              ...p.fields,
              [key]: value,
            },
          }
        : p
    ))
  }


  const removeProduct = (id: number) => {
    setProducts(products.filter(p => p.id !== id))
  }

   const [customers, setCustomers] = useState<any[]>([])
    const [catalogProducts, setCatalogProducts] = useState<any[]>([])

    const [customer, setCustomer] = useState<any>(null)

    const [products, setProducts] = useState<any[]>([
      {
        id: Date.now(),
        product_id: "",
        quantity: 1,
        catatan: "",
        need_design: false,
        design_file: null,      // file desain final
        support_file: null,
        fields: {},
      }
    ])

  const updateProductData = (
    id: number,
    product_id: string
  ) => {
    setProducts(products.map((p) =>
      p.id === id
        ? {
            ...p,
            product_id,
          }
        : p
    ))
  }

  const normalizeFields = (fields: any) => {
    if (!fields) return []

    if (Array.isArray(fields)) return fields

    if (typeof fields === "string") {
      try {
        const parsed = JSON.parse(fields)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }

    return []
  }

  const getActiveFiles = (p: any) => {
  return p.need_design ? p.support_files : p.design_files
}

  const updateFiles = (
  id: number,
  key: "design_files" | "support_files",
  files: FileList | null
) => {
  if (!files) return

  setProducts((prev) =>
    prev.map((p) => {
      if (p.id !== id) return p

      const existing = p[key] || []

      return {
        ...p,
        [key]: [
          ...existing,
          ...Array.from(files),
        ],
      }
    })
  )
}

  const updateField = (
    id: number,
    key: string,
    value: any
  ) => {
    setProducts(products.map((p) =>
      p.id === id
        ? {
            ...p,
            [key]: value,
          }
        : p
    ))
  }

  // --- CALCULATION ---
  const total = useMemo(() => {
    return products.reduce((acc, item) => {

      const product = catalogProducts.find(
        (p) => p.id == item.product_id
      )

      const price = product?.price || 0

      return acc + (price * item.quantity)

    }, 0)
  }, [products, catalogProducts])
  
  const [showCheckout, setShowCheckout] =
  useState(false)

  // --- SUBMIT ---
  const handleSubmit = async () => {
    if (!customer) {
      return toast({
        title: "Error",
        description: "Pilih customer dulu",
        variant: "destructive",
      })
    }

    const validProducts = products.filter(
      (p) => p.product_id && p.quantity > 0
    )

    if (validProducts.length === 0) {
      return toast({
        title: "Error",
        description: "Minimal 1 produk harus dipilih",
        variant: "destructive",
      })
    }

    setLoading(true)

    try {

      const formData = new FormData()

      formData.append("customer_id", customer.id)
      formData.append("total_price", total.toString())

      validProducts.forEach((p, index) => {

        formData.append(
          `items[${index}][product_id]`,
          p.product_id
        )

        formData.append(
          `items[${index}][quantity]`,
          p.quantity
        )

        formData.append(
          `items[${index}][catatan]`,
          p.catatan || ""
        )

        formData.append(
          `items[${index}][need_design]`,
          p.need_design ? "1" : "0"
        )

        formData.append(
          `items[${index}][fields]`,
          JSON.stringify(p.fields || {})
        )

        // DESIGN FILE
        p.design_files?.forEach((file: File) => {
          formData.append(
            `items[${index}][design_file][]`,
            file
          )
        })

        // REFERENCE FILES
        p.support_files?.forEach((file: File) => {
          formData.append(
            `items[${index}][reference_files][]`,
            file
          )
        })
      })

      await apiFetch("/orders", {
        method: "POST",
        body: formData,
      })

      toast({
        title: "Berhasil",
        description: "Pesanan berhasil dibuat",
      })

      onSuccess()
      onClose()

    } catch (err) {

      console.error(err)

      toast({
        title: "Gagal",
        description: "Pesanan gagal dibuat",
        variant: "destructive",
      })

    } finally {

      setLoading(false)

    }
  }

  useEffect(() => {
    fetchCustomers()
    fetchProducts()
  }, [])

  const fetchCustomers = async () => {
    try {
      const res = await apiFetch("/customers")
      setCustomers(Array.isArray(res) ? res : res.data || [])
    } catch (err) {
      console.error(err)
    }
  }

  const fetchProducts = async () => {
  try {
    const res = await apiFetch("/products/active")
    setCatalogProducts(Array.isArray(res) ? res : res.data || [])
  } catch (err) {
    console.error(err)
  }
}

  return (
    <Dialog open={open} onOpenChange={onClose}>
      {/* max-w-4xl karena form pesanan lebih lebar dari sekedar input customer */}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" /> Buat Pesanan Baru
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* KOLOM KIRI: FORM (COL-SPAN 2) */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Step 1: Customer */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase text-gray-400 flex items-center gap-2">
                <UserSearch className="w-4 h-4" /> 1. Data Customer
              </label>
              <div className="relative">
              <Input
                placeholder="Masukkan No HP..."
                value={phoneSearch}
                onChange={(e) => {

                  const value = e.target.value

                  setPhoneSearch(value)

                  if (!value) {
                    setFilteredCustomers([])
                    setShowNewCustomerForm(false)
                    return
                  }

                  const results = customers.filter((c) =>
                    c.phone?.toLowerCase().includes(value.toLowerCase())
                  )

                  setFilteredCustomers(results)
                  if (results.length === 0) {

                  setShowNewCustomerForm(true)

                  setNewCustomer({
                    name: "",
                    phone: value,
                    email: "",
                    address: "",
                  })

                } else {

                  setShowNewCustomerForm(false)

                }
                }}
                className="bg-gray-50"
              />

              {filteredCustomers.length > 0 && (
                <div className="absolute z-50 mt-2 w-full bg-white border rounded-lg shadow-lg max-h-52 overflow-y-auto">

                  {filteredCustomers.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setCustomer(item)
                        setPhoneSearch(item.phone)
                        setFilteredCustomers([])
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b"
                    >
                      <p className="text-sm font-medium">
                        {item.name}
                      </p>

                      <p className="text-xs text-gray-500">
                        {item.phone}
                      </p>
                    </button>
                  ))}

                </div>
              )}

            </div>
              {customer && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-blue-700">{customer.name}</p>
                    <p className="text-xs text-blue-500">{customer.phone}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setCustomer(null)}><X className="w-4 h-4"/></Button>
                </div>
              )}
              {showNewCustomerForm && !customer && (
                <div className="border rounded-xl p-4 space-y-3 bg-orange-50 border-orange-200">

                  <p className="text-sm font-semibold text-orange-700">
                    Customer belum terdaftar
                  </p>

                  <Input
                    placeholder="Nama Customer"
                    value={newCustomer.name}
                    onChange={(e) =>
                      setNewCustomer({
                        ...newCustomer,
                        name: e.target.value,
                      })
                    }
                  />

                  <Input
                    placeholder="No HP"
                    value={newCustomer.phone}
                    onChange={(e) =>
                      setNewCustomer({
                        ...newCustomer,
                        phone: e.target.value,
                      })
                    }
                  />

                  <Input
                    placeholder="Email"
                    value={newCustomer.email}
                    onChange={(e) =>
                      setNewCustomer({
                        ...newCustomer,
                        email: e.target.value,
                      })
                    }
                  />

                  <Input
                    placeholder="Alamat"
                    value={newCustomer.address}
                    onChange={(e) =>
                      setNewCustomer({
                        ...newCustomer,
                        address: e.target.value,
                      })
                    }
                  />

                  <Button
                    type="button"
                    className="w-full"
                    onClick={async () => {
                      try {

                        const res = await apiFetch("/customers", {
                          method: "POST",
                          body: JSON.stringify(newCustomer),
                        })

                        const createdCustomer =
                          res.data || res

                        setCustomer(createdCustomer)

                        setCustomers([
                          ...customers,
                          createdCustomer,
                        ])

                        setShowNewCustomerForm(false)

                        toast({
                          title: "Berhasil",
                          description: "Customer berhasil ditambahkan",
                        })

                      } catch (err) {

                        console.error(err)

                        toast({
                          title: "Gagal",
                          description: "Customer gagal ditambahkan",
                          variant: "destructive",
                        })
                      }
                    }}
                  >
                    Simpan Customer
                  </Button>

                </div>
              )}
            </div>

            <Separator />

            {/* Step 2: Produk */}
            <div className="space-y-4">
              <label className="text-xs font-bold uppercase text-gray-400 flex items-center gap-2">
                <Package className="w-4 h-4" /> 2. Pilih Produk
              </label>
              
              {products.map((p, idx) => (
                <div key={p.id} className="p-4 border rounded-xl relative bg-gray-50/30">
                  <Button 
                    variant="ghost" size="icon" 
                    className="absolute -top-2 -right-2 h-7 w-7 bg-white border shadow-sm text-red-500 rounded-full"
                    onClick={() => removeProduct(p.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium text-gray-400">Nama Produk</p>
                      <Select onValueChange={(val) => updateProductData(p.id, val)}>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Pilih Produk..." />
                        </SelectTrigger>
                        <SelectContent>
                          {catalogProducts.map((item: any) => (
                              <SelectItem
                                key={item.id}
                                value={String(item.id)}
                              >
                                {item.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {p.product_id && (
  <div className="col-span-2 space-y-3">
    
    {/* qty + catatan */}
    <div className="grid grid-cols-2 gap-2">
      
      <div>
        <p className="text-[10px] text-gray-400">Qty</p>
        <Input
          type="number"
          className="h-9 bg-white"
          value={p.quantity}
          onChange={(e) =>
            updateField(p.id, "quantity", e.target.value)
          }
        />
      </div>

      <div>
        <p className="text-[10px] text-gray-400">Catatan</p>
        <Input
          className="h-9 bg-white"
          value={p.catatan}
          onChange={(e) =>
            updateField(p.id, "catatan", e.target.value)
          }
        />
      </div>

    </div>
      {/* NEED DESIGN */}
<div className="flex items-center gap-2">
  <input
    type="checkbox"
    checked={p.need_design}
    onChange={(e) =>
      updateField(p.id, "need_design", e.target.checked)
    }
  />
  <span className="text-xs text-gray-600">
    Butuh desain
  </span>
</div>

{/* UPLOAD AREA */}
<div>
  <p className="text-[10px] text-gray-400 mb-1">
    {p.need_design
      ? "File Pendukung (opsional, bisa lebih dari 1)"
      : "File Desain (bisa lebih dari 1)"}
  </p>

  <Input
    key={`file-${p.id}-${p.need_design}`}
    type="file"
    multiple
    onChange={(e) =>
      updateFiles(
        p.id,
        p.need_design ? "support_files" : "design_files",
        e.target.files
      )
    }
  />

  {/* PREVIEW LIST */}
    {getActiveFiles(p)?.length > 0 && (
      <div className="mt-2 space-y-2">
        {getActiveFiles(p).map((file: File, i: number) => (
          <div
            key={file.name}
            className="flex items-center justify-between gap-2 text-xs bg-white border rounded-lg px-3 py-2 shadow-sm"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span>📄</span>
              <span className="truncate max-w-[200px]">
                {file.name}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                const key = p.need_design ? "support_files" : "design_files"

                const updated = getActiveFiles(p).filter((file: File, idx: number) => idx !== i)

                setProducts(products.map(prod =>
                  prod.id === p.id
                    ? {
                        ...prod,
                        [key]: updated
                      }
                    : prod
                ))
              }}
              className="text-red-500 hover:text-red-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-2 text-gray-400">
              <span>
                {(file.size / 1024).toFixed(1)} KB
              </span>
            </div>
          </div>
        ))}
      </div>
    )}
</div>
   


    {/* 🔥 DYNAMIC FIELDS */}
    <div className="grid grid-cols-2 gap-2">
      {normalizeFields(getProduct(p.product_id)?.fields).map((f: any) => (
        <div key={f.label}>
          <p className="text-[10px] text-gray-400">
            {f.label}
          </p>

          {f.type === "select" ? (
            <Select
              onValueChange={(val) =>
                updateDynamicField(p.id, f.label, val)
              }
            >
              <SelectTrigger className="h-9 bg-white">
                <SelectValue placeholder="Pilih" />
              </SelectTrigger>
              <SelectContent>
                {(f.options || []).map((opt: string) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              className="h-9 bg-white"
              onChange={(e) =>
                updateDynamicField(
                  p.id,
                  f.label,
                  e.target.value
                )
              }
            />
          )}
        </div>
      ))}
    </div>

  </div>
)}
                  </div>
                </div>
              ))}

              <Button variant="outline" className="w-full border-dashed" onClick={addProduct}>
                <Plus className="w-4 h-4 mr-2" /> Tambah Item
              </Button>
            </div>
          </div>

          {/* KOLOM KANAN: RINGKASAN (COL-SPAN 1) */}
          <div className="bg-gray-50 p-4 rounded-xl space-y-4 border h-fit">
            <div className="flex items-center gap-2 font-bold text-sm">
              <Receipt className="w-4 h-4 text-gray-400" /> Ringkasan
            </div>
            <Separator />
            <div className="space-y-2 max-h-40 overflow-y-auto">
            {products
              .filter((p) => p.product_id)
              .map((p, i) => {

                const product = catalogProducts.find(
                  (item) => item.id == p.product_id
                )

                return (
                  <div
                    key={p.id}
                    className="flex justify-between text-xs"
                  >
                    <span className="text-gray-500">
                      {p.quantity}x {product?.name}
                    </span>

                    <span className="font-medium">
                      Rp{" "}
                      {(
                        (product?.price || 0) * p.quantity
                      ).toLocaleString("id-ID")}
                    </span>
                  </div>
                )
              })}
          </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-400">TOTAL</span>
              <span className="text-xl font-black text-blue-600">Rp {total.toLocaleString()}</span>
            </div>
            <Button
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                if (!customer) {
                  return toast({
                    title: "Error",
                    description: "Pilih customer dulu",
                    variant: "destructive",
                  })
                }

                const validProducts = products.filter(
                  (p) => p.product_id && p.quantity > 0
                )

                if (validProducts.length === 0) {
                  return toast({
                    title: "Error",
                    description: "Minimal pilih 1 produk",
                    variant: "destructive",
                  })
                }

                setShowCheckout(true)
                onClose()
              }}
            >
              Lanjut Pembayaran
            </Button>
          </div>

        </div>
      </DialogContent>
      <PaymentModal
        customer={customer}
        open={showCheckout}
        products={products.map((p) => {

          const product = catalogProducts.find(
            (item) => item.id == p.product_id
          )

          return {
            ...p,
            product_name: product?.name || "-",
            price: product?.price || 0,
          }
        })}

        total={total}
        onClose={() => setShowCheckout(false)}
        onConfirm={async () => {

          await handleSubmit()

          setShowCheckout(false)

        }}
      />
    </Dialog>
  )
}