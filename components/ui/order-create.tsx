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
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

// Katalog produk (Bisa kamu pindahkan ke file konstanta tersendiri nanti)
const PRODUCTS_CATALOG: Record<string, any> = {
  kaos_custom: {
    label: 'Kaos Custom', price: 75000,
    fields: [
      { key: 'ukuran', label: 'Ukuran', type: 'select', opts: ['S', 'M', 'L', 'XL'] },
      { key: 'qty', label: 'Qty', type: 'number' },
      { key: 'catatan', label: 'Catatan', type: 'text', full: true },
    ]
  },
  topi_bordir: {
    label: 'Topi Bordir', price: 95000,
    fields: [
      { key: 'teks', label: 'Teks Bordir', type: 'text' },
      { key: 'qty', label: 'Qty', type: 'number' },
    ]
  }
};

export default function OrderCreateModal({ open, onClose, onSuccess }: Props) {
  const { toast } = useToast()
  
  // --- STATE ---
  const [phoneSearch, setPhoneSearch] = useState("")
  const [customer, setCustomer] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([
    { id: Date.now(), productKey: '', fields: { qty: '1' } }
  ])

  // --- LOGIC: CUSTOMER ---
  const handleSearchCustomer = async () => {
    // Simulasi cari ke API / db dummy
    if(phoneSearch === "0812") { // Contoh ketemu
        setCustomer({ name: "Budi Santoso", phone: "08123456789" })
    } else {
        toast({ title: "Tidak ditemukan", description: "Customer belum terdaftar", variant: "destructive" })
    }
  }

  // --- LOGIC: PRODUCTS ---
  const addProduct = () => {
    setProducts([...products, { id: Date.now(), productKey: '', fields: { qty: '1' } }])
  }

  const removeProduct = (id: number) => {
    setProducts(products.filter(p => p.id !== id))
  }

  const updateProductData = (id: number, key: string) => {
    setProducts(products.map(p => p.id === id ? { ...p, productKey: key, fields: { qty: '1' } } : p))
  }

  const updateField = (pid: number, fkey: string, val: string) => {
    setProducts(products.map(p => p.id === pid ? { ...p, fields: { ...p.fields, [fkey]: val } } : p))
  }

  // --- CALCULATION ---
  const total = useMemo(() => {
    return products.reduce((acc, p) => {
      const price = PRODUCTS_CATALOG[p.productKey]?.price || 0
      return acc + (price * parseInt(p.fields.qty || 0))
    }, 0)
  }, [products])

  // --- SUBMIT ---
  const handleSubmit = async () => {
    if (!customer) return toast({ title: "Error", description: "Pilih customer dulu", variant: "destructive" })
    
    try {
      // Logika fetch API kamu di sini (mirip CustomerCreateModal)
      toast({ title: "Berhasil", description: "Pesanan berhasil dibuat" })
      onSuccess()
      onClose()
      // Reset state
      setCustomer(null)
      setProducts([{ id: Date.now(), productKey: '', fields: { qty: '1' } }])
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
              <div className="flex gap-2">
                <Input 
                  placeholder="Masukkan No HP..." 
                  value={phoneSearch}
                  onChange={(e) => setPhoneSearch(e.target.value)}
                  className="bg-gray-50"
                />
                <Button variant="secondary" onClick={handleSearchCustomer}>Cari</Button>
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
                          {Object.entries(PRODUCTS_CATALOG).map(([k, v]: any) => (
                            <SelectItem key={k} value={k}>{v.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {p.productKey && (
                       <div className="grid grid-cols-2 gap-2">
                          {PRODUCTS_CATALOG[p.productKey].fields.map((f: any) => (
                            <div key={f.key} className={f.full ? "col-span-2" : ""}>
                               <p className="text-[10px] font-medium text-gray-400">{f.label}</p>
                               {f.type === 'select' ? (
                                 <Select onValueChange={(v) => updateField(p.id, f.key, v)}>
                                   <SelectTrigger className="h-9 bg-white"><SelectValue /></SelectTrigger>
                                   <SelectContent>{f.opts.map((o:any)=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                 </Select>
                               ) : (
                                 <Input 
                                  className="h-9 bg-white" 
                                  type={f.type} 
                                  value={p.fields[f.key]} 
                                  onChange={(e) => updateField(p.id, f.key, e.target.value)} 
                                 />
                               )}
                            </div>
                          ))}
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
              {products.filter(p => p.productKey).map((p, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-gray-500">{p.fields.qty}x {PRODUCTS_CATALOG[p.productKey].label}</span>
                  <span className="font-medium">Rp {(PRODUCTS_CATALOG[p.productKey].price * p.fields.qty).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-400">TOTAL</span>
              <span className="text-xl font-black text-blue-600">Rp {total.toLocaleString()}</span>
            </div>
            <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleSubmit}>
              <Check className="w-4 h-4 mr-2" /> Simpan Pesanan
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}