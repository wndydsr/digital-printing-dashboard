"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Download,
  ArrowLeft,
  CheckCircle2,
  Printer,
} from "lucide-react"

import { apiFetch } from "@/lib/api"
import { OperatorLayout } from "@/components/layout/OperatorLayout"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Order {
  id: number
  order_code: string
  order_date: string
  notes?: string
  specification?: string

  customer?: {
    name: string
  }

  items?: {
    id: number
    quantity?: number
    details?: any
    catatan?: string

    product?: {
      name: string
      description?: string
    }

    // Relasi ke tabel order_item_designs
    design?: {
      id?: number
      design_file?: string
      reference_files?: string[]
      design_notes?: string | null
      design_status?: string
    }
  }[]

  stage?: {
    id?: number
    name: string
    status?: {
      id?: number
      name: string
    }
  }
}

export default function OperatorOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  // =========================
  // HELPER URL FILE
  // =========================
  const getFileUrl = (rawFile: string | null | undefined) => {
    if (!rawFile) return null

    if (
      rawFile.startsWith("http://") ||
      rawFile.startsWith("https://")
    ) {
      return rawFile
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
      "http://127.0.0.1:8000"

    if (rawFile.startsWith("storage/")) {
      return `${baseUrl}/${rawFile}`
    }

    return `${baseUrl}/storage/${rawFile}`
  }

  // =========================
  // LOAD DATA ORDER
  // =========================
  const fetchOrder = async () => {
    try {
      const data = await apiFetch(`/orders/${id}`)
      const result = data.data || data

      console.log("DETAIL ORDER OPERATOR:", result)
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

  // =========================
  // UPDATE STAGE
  // =========================
  const updateStage = async (stage: string) => {
    try {
      await apiFetch(`/orders/${id}`, {
        method: "PUT",
        body: JSON.stringify({ stage }),
      })
      await fetchOrder()
    } catch (error) {
      console.error("Gagal update stage:", error)
    }
  }

  const formatLabel = (text: string) => {
    return text
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }

  // =========================
  // HANDLE DOWNLOAD
  // =========================
 const handleDownload = async (filepath: string) => {
    try {
      const token = localStorage.getItem("token")
      
      // 🔒 Gunakan encodeURIComponent agar 'chat-designs/file.png' menjadi 'chat-designs%2Ffile.png'
      // Ini mencegah rusaknya struktur segment URL di API Laravel kamu
      const securedFilename = encodeURIComponent(filepath)
      const downloadUrl = `http://127.0.0.1:8000/api/download/design/${securedFilename}`

      console.log("MENEMBAK ENDPOINT DOWNLOAD:", downloadUrl)

      const response = await fetch(downloadUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        },
      })

      if (!response.ok) throw new Error("Gagal mengunduh berkas dari server API")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)

      const a = document.createElement("a")
      a.href = url
      // Mengambil nama file murni di ujung path untuk nama file download
      a.download = filepath.split("/").pop() || "desain-final"

      document.body.appendChild(a)
      a.click()
      a.remove()

      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Download Error:", err)
      alert("Gagal mengunduh berkas desain. Pastikan konfigurasi CORS di Laravel sudah aktif.")
    }
  }
    
  if (loading) {
    return (
      <OperatorLayout>
        <div className="p-6">Loading...</div>
      </OperatorLayout>
    )
  }

  if (!order) {
    return (
      <OperatorLayout>
        <div className="p-6">Data tidak ditemukan</div>
      </OperatorLayout>
    )
  }

  const currentStage = order.stage?.name?.toLowerCase() || ""

  return (
    <OperatorLayout>
      <div className="space-y-6">
        {/* ================= HEADER ================= */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div>
            <h1 className="text-2xl font-semibold">Detail Pesanan</h1>
            <p className="text-gray-500">{order.order_code}</p>
          </div>
        </div>

        {/* ================= INFORMASI PESANAN ================= */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Pesanan</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            <p><strong>Pelanggan:</strong> {order.customer?.name || "-"}</p>
            <p><strong>Tanggal:</strong> {new Date(order.order_date).toLocaleString("id-ID")}</p>
            <div className="flex items-center gap-2">
              <strong>Status:</strong>
              <Badge variant="outline">
                {order.stage?.status?.name || order.stage?.name || "-"}
              </Badge>
            </div>
            <p><strong>Catatan:</strong> {order.notes || "-"}</p>
          </CardContent>
        </Card>

        {/* ================= PRODUK & FILE DESAIN FINAL ================= */}
        {order.items && order.items.length > 0 ? (
          order.items.map((item, index) => {
            // Mengambil berkas secara aman dari relasi item.design
            const rawFile = item.design?.design_file

            return (
              <Card key={index}>
                <CardHeader>
                  <CardTitle>{item.product?.name || "Produk"}</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p><strong>Jumlah:</strong> {item.quantity || 0}</p>

                  {/* Spesifikasi */}
                  <div>
                    <strong>Spesifikasi:</strong>
                    {item.details ? (
                      <div className="space-y-1 mt-2">
                        {Object.entries(
                          typeof item.details === "string"
                            ? JSON.parse(item.details)
                            : item.details
                        ).map(([key, value]) => (
                          <div key={key} className="flex justify-between border-b pb-1 text-sm">
                            <span className="text-gray-500">{formatLabel(key)}</span>
                            <span className="font-medium">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 mt-1">-</p>
                    )}
                  </div>

                  {/* Tampilan File Desain Terintegrasi */}
                  {rawFile ? (
                    <div className="space-y-2 pt-4 border-t border-slate-100">
                      <p className="font-bold text-sm text-slate-800 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        File Desain Final (Telah Disetujui Customer)
                      </p>

                      <Button
                        variant="outline"
                        className="flex items-center gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-semibold text-xs rounded-xl"
                        onClick={() => handleDownload(rawFile)}
                      >
                        <Download className="w-4 h-4" />
                        Download File Desain
                      </Button>

                      <p className="text-xs text-gray-400 break-all bg-slate-50 p-2 rounded-lg border border-slate-100 font-mono">
                        {rawFile.split("/").pop()}
                      </p>
                    </div>
                  ) : (
                    <div className="text-xs font-semibold text-amber-600 bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                      File Desain: Belum ada file desain yang disetujui untuk item pesanan ini.
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        ) : (
          <Card>
            <CardContent className="p-6 text-gray-500">Tidak ada item produk.</CardContent>
          </Card>
        )}

        {/* ================= TOMBOL AKSI ALUR CETAK ================= */}
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-3">
              {currentStage === "siap cetak" && (
                <Button
                  className="bg-blue-600 hover:bg-blue-700 rounded-xl font-bold transition-all active:scale-95"
                  onClick={() => updateStage("cetak")}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Mulai Cetak
                </Button>
              )}

              {currentStage === "cetak" && (
                <Button
                  className="bg-green-600 hover:bg-green-700 rounded-xl font-bold transition-all active:scale-95"
                  onClick={() => updateStage("selesai")}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Tandai Selesai
                </Button>
              )}

              {currentStage === "selesai" && (
                <Badge className="bg-green-100 text-green-700 border border-green-200 font-bold py-2 px-4 rounded-xl">
                  Pesanan Selesai
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </OperatorLayout>
  )
}