"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Download, ArrowLeft, CheckCircle2, Printer } from "lucide-react"
import { apiFetch } from "@/lib/api"
import { OperatorLayout } from "@/components/layout/OperatorLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Order {
  id: number
  order_code: string
  order_date: string
  notes?: string
  customer?: { name: string }
  items?: {
    id: number
    quantity?: number
    panjang?: number | string
    lebar?: number | string
    details?: any
    catatan?: string
    order_stage_id?: number
    stage?: { name: string; status?: { name: string } }
    product?: { name: string; description?: string }
    design?: { id?: number; design_file?: string; reference_files?: string[] }
  }[]
  stage?: { id?: number; name: string; status?: { id?: number; name: string } }
}

export default function OperatorOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const id = params.id as string
  const focusedItemId = searchParams.get("item") // 🔥 Deteksi fokus item dari URL

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  // Ambil URL dasar host tanpa suffix /api untuk render asset storage hosting
  const getBaseUrl = () => {
    const rawUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.prinora.store/api"
    return rawUrl.endsWith("/api") ? rawUrl.slice(0, -4) : rawUrl
  }

  const getFileUrl = (rawFile: string | null | undefined) => {
    if (!rawFile) return null
    if (rawFile.startsWith("http://") || rawFile.startsWith("https://")) return rawFile
    const baseUrl = getBaseUrl()
    return rawFile.startsWith("storage/") ? `${baseUrl}/${rawFile}` : `${baseUrl}/storage/${rawFile}`
  }

  const fetchOrder = async () => {
    try {
      const data = await apiFetch(`/orders/${id}`)
      const result = data.data || data
      setOrder(result)
    } catch (error) {
      console.error("Gagal memuat detail pesanan:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrder()
  }, [])

  const updateItemStage = async (stageId: number) => {
    if (!focusedItemId) return
    try {
      // 🔥 Menembak endpoint update per item produk cetak
      await apiFetch(`/orders/items/${focusedItemId}/stage`, {
        method: "PUT",
        body: JSON.stringify({ current_stage_id: stageId }),
      })
      await fetchOrder()
    } catch (error) {
      console.error("Gagal mematangkan tahapan produksi cetak item:", error)
    }
  }

  const formatLabel = (text: string) => {
    return text.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  }

  const handleDownload = async (filepath: string) => {
    try {
      const token = localStorage.getItem("token")
      const baseUrl = getBaseUrl()
      
      // Dinamis mengikuti domain hosting server production
      const downloadUrl = `${baseUrl}/api/download/design/${filepath}`

      const response = await fetch(downloadUrl, {
        method: "GET",
        headers: { 
          "Authorization": `Bearer ${token}`, 
          "Accept": "application/json" 
        },
      })
      
      if (!response.ok) throw new Error("Gagal mengunduh berkas fisik dari server")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filepath.split("/").pop() || "desain-final"
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert("Gagal mengunduh berkas desain. Pastikan file fisik ada di server storage.");
    }
  }
    
  if (loading) return <OperatorLayout><div className="p-6">Loading...</div></OperatorLayout>
  if (!order) return <OperatorLayout><div className="p-6">Data tidak ditemukan</div></OperatorLayout>

  // Cari item produk yang sedang difokuskan oleh operator di halaman ini
  const activeItem = order.items?.find((item) => String(item.id) === String(focusedItemId)) || order.items?.[0]
  const currentItemStageName = activeItem?.stage?.name?.toLowerCase() || order.stage?.name?.toLowerCase() || ""

  const itemDetails = (() => {
    if (!activeItem?.details) return {}
    
    try {
      // Pembongkaran tahap pertama
      let parsed = typeof activeItem.details === "string" 
        ? JSON.parse(activeItem.details) 
        : activeItem.details

      // 🔥 KUNCI UTAMA: Jika setelah di-parse masih string JSON, bongkar sekali lagi!
      if (typeof parsed === "string") {
        parsed = JSON.parse(parsed)
      }
      
      return parsed || {}
    } catch (e) {
      console.error("Gagal memetakan spesifikasi atribut produksi:", e)
      return {}
    }
  })()

  return (
    <OperatorLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.back()}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h1 className="text-2xl font-semibold">Lembar Kerja Produksi</h1>
            <p className="text-gray-500">{order.order_code} {activeItem ? `— ${activeItem.product?.name}` : ""}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {activeItem && (
              <Card className="border-blue-200 bg-blue-50/10">
                <CardHeader>
                  <CardTitle className="text-blue-700">Spesifikasi Item Cetak</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p><strong>Nama Barang:</strong> {activeItem.product?.name}</p>
                  <p><strong>Jumlah Produksi:</strong> {activeItem.quantity || 0} pcs</p>

                 {(Number(activeItem.panjang) > 0 || Number(activeItem.lebar) > 0) && (
                    <p>
                      <strong>Ukuran Dimensi:</strong>{" "}
                      <span className="font-semibold text-slate-800">
                        {/* Menggunakan Math.round agar desainer/operator melihat angka bulat murni */}
                        {Math.round(Number(activeItem.panjang))} cm x {Math.round(Number(activeItem.lebar))} cm
                      </span>
                    </p>
                  )}
                  <div>
                    <strong>Kustomisasi Spesifikasi:</strong>
                    {activeItem.details ? (
                      <div className="space-y-1 mt-2 bg-white p-3 rounded-lg border">
                        {Object.entries(itemDetails).map(([key, value]) => (
                          <div key={key} className="flex justify-between border-b pb-1 text-sm">
                            <span className="text-gray-500">{formatLabel(key)}</span>
                            <span className="font-medium">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-sm text-gray-500 mt-1">-</p>}
                  </div>

                  {activeItem.design?.design_file ? (
                    <div className="space-y-2 pt-4 border-t">
                      <p className="font-bold text-sm text-slate-800 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        File Berkas Siap Cetak (Approved)
                      </p>
                      <Button variant="outline" className="text-indigo-600 border-indigo-200" onClick={() => handleDownload(activeItem.design!.design_file!)}>
                        <Download className="w-4 h-4 mr-2" /> Download File Desain
                      </Button>
                    </div>
                  ) : (
                    <div className="text-xs font-semibold text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-100">
                      Belum ada berkas desain final pada antrian item cetak ini.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Informasi Transaksi</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p><strong>Pelanggan:</strong> {order.customer?.name || "-"}</p>
                <p><strong>Masuk Antrian:</strong> {new Date(order.order_date).toLocaleDateString("id-ID")}</p>
                <div className="flex items-center gap-2">
                  <strong>Status Item:</strong>
                  <Badge variant="secondary" className="bg-blue-50 text-blue font-bold">
                    {activeItem?.stage?.name || order.stage?.name || "-"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Kontrol Mesin Produksi</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  {currentItemStageName === "siap cetak" && (
                    <Button className="bg-blue-600 hover:bg-blue-700 w-full" onClick={() => updateItemStage(4)}>
                      <Printer className="w-4 h-4 mr-2" /> Mulai Proses Cetak
                    </Button>
                  )}
                  {currentItemStageName === "proses cetak" && (
                    <Button className="bg-green-600 hover:bg-green-700 w-full" onClick={() => updateItemStage(5)}>
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Selesaikan Cetak
                    </Button>
                  )}
                  {currentItemStageName === "selesai" && (
                    <div className="text-center py-2 bg-green-50 text-green-700 rounded-xl border border-green-200 font-bold text-sm">
                      ✓ Selesai Diproduksi
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </OperatorLayout>
  )
}