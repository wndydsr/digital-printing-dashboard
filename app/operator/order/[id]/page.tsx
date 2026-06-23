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

// GANTI SELURUH INTERFACE Order MENJADI SEPERTI INI
// Karena file desain tidak ada di order.items,
// tetapi berada di relasi order.items[].design

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
  // Ganti fungsi getFileUrl menjadi seperti ini

// Ganti fungsi getFileUrl() menjadi seperti ini

// GANTI FUNGSI getFileUrl MENJADI SEPERTI INI

const getFileUrl = (
    item: NonNullable<Order["items"]>[number]
    ) => {
    // File desain berada di item.design.design_file
    const rawFile = item.design?.design_file

    console.log("DESIGN OBJECT:", item.design)
    console.log("RAW FILE:", rawFile)

    if (!rawFile) return null

    // Jika sudah berupa URL lengkap
    if (
        rawFile.startsWith("http://") ||
        rawFile.startsWith("https://")
    ) {
        return rawFile
    }

    
    const baseUrl =
        process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
        `${(process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api").replace("/api", "")}`

    // Jika path sudah diawali storage/
    if (rawFile.startsWith("storage/")) {
        return `${baseUrl}/${rawFile}`
    }

    // Karena di database tersimpan:
    // designs/xxxxxxxx.png
    // maka URL menjadi:
    // http://127.0.0.1:8000/storage/designs/xxxxxxxx.png
    return `${baseUrl}/storage/${rawFile}`
    }

  // =========================
  // LOAD DATA ORDER
  // =========================
  // Ganti bagian fetchOrder() menjadi seperti ini agar bisa melihat struktur data dari backend

const fetchOrder = async () => {
  try {
    const data = await apiFetch(`/orders/${id}`)
    const result = data.data || data

    // DEBUG: lihat struktur data lengkap di browser console
    console.log("DETAIL ORDER:", result)
    console.log("ORDER ITEMS:", result.items)

    if (result.items && result.items.length > 0) {
      result.items.forEach((item: any, index: number) => {
        console.log(`ITEM ${index + 1}:`, item)
        console.log(`ITEM ${index + 1} FILE FIELDS:`, {
          design_file: item.design_file,
          design_path: item.design_path,
          file: item.file,
          file_path: item.file_path,
          attachment: item.attachment,
          artwork_file: item.artwork_file,
          // kemungkinan field lain
          image: item.image,
          image_path: item.image_path,
          upload_file: item.upload_file,
          file_desain: item.file_desain,
        })
      })
    }

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

  // =========================
  // LOADING
  // =========================
  if (loading) {
    return (
      <OperatorLayout>
        <div className="p-6">Loading...</div>
      </OperatorLayout>
    )
  }

  // =========================
  // DATA TIDAK DITEMUKAN
  // =========================
  if (!order) {
    return (
      <OperatorLayout>
        <div className="p-6">Data tidak ditemukan</div>
      </OperatorLayout>
    )
  }

  const currentStage = order.stage?.name?.toLowerCase() || ""

  const formatLabel = (text: string) => {
    return text
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    }

    const handleDownload = async (filepath: string) => {
    try {
        const token = localStorage.getItem("token")

        const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api"}/download/design/${filepath}`,
        {
            headers: {
            Authorization: `Bearer ${token}`,
            },
        }
        )

        if (!response.ok) {
        throw new Error("Gagal download file")
        }

        const blob = await response.blob()

        const url = window.URL.createObjectURL(blob)

        const a = document.createElement("a")
        a.href = url

        a.download =
        filepath.split("/").pop() || "download"

        document.body.appendChild(a)
        a.click()
        a.remove()

        window.URL.revokeObjectURL(url)

    } catch (err) {
        console.error(err)
    }
    }
    
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
            <h1 className="text-2xl font-semibold">
              Detail Pesanan
            </h1>
            <p className="text-gray-500">
              {order.order_code}
            </p>
          </div>
        </div>

        {/* ================= INFORMASI PESANAN ================= */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Pesanan</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            <p>
              <strong>Pelanggan:</strong>{" "}
              {order.customer?.name || "-"}
            </p>

            <p>
              <strong>Tanggal:</strong>{" "}
              {new Date(order.order_date).toLocaleString(
                "id-ID"
              )}
            </p>

            <div className="flex items-center gap-2">
              <strong>Status:</strong>
              <Badge variant="outline">
                {order.stage?.status?.name || "-"}
              </Badge>
            </div>

            <p>
              <strong>Catatan:</strong>{" "}
              {order.notes || "-"}
            </p>
          </CardContent>
        </Card>

        {/* ================= PRODUK ================= */}
        {order.items && order.items.length > 0 ? (
          order.items.map((item, index) => {
            const rawFile = item.design?.design_file

            return (
              <Card key={index}>
                <CardHeader>
                  <CardTitle>
                    {item.product?.name || "Produk"}
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Jumlah */}
                  <p>
                    <strong>Jumlah:</strong>{" "}
                    {item.quantity || 0}
                  </p>

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
                            <div
                            key={formatLabel(key)}
                            className="flex justify-between border-b pb-1 text-sm"
                            >
                            <span className="text-gray-500">
                                {formatLabel(key)}
                            </span>

                            <span className="font-medium">
                                {String(value)}
                            </span>
                            </div>
                        ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 mt-1">
                        -
                        </p>
                    )}
                    </div>

                                    {rawFile ? (
                    <div className="space-y-2">
                        <p className="font-medium">
                        File Desain
                        </p>

                        <Button
                        variant="outline"
                        className="flex items-center gap-2"
                        onClick={() => handleDownload(rawFile)}
                        >
                        <Download className="w-4 h-4" />
                        Download File Desain
                        </Button>

                        <p className="text-sm text-gray-500 break-all">
                        {rawFile.split("/").pop()}
                        </p>
                    </div>
                    ) : (
                    <div className="text-sm text-gray-500">
                      <strong>File Desain:</strong>{" "}
                      Tidak ada file
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        ) : (
          <Card>
            <CardContent className="p-6 text-gray-500">
              Tidak ada item produk.
            </CardContent>
          </Card>
        )}

        {/* ================= TOMBOL AKSI ================= */}
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-3">
              {/* Jika status siap cetak */}
              {currentStage === "siap cetak" && (
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => updateStage("cetak")}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Mulai Cetak
                </Button>
              )}

              {/* Jika sedang cetak */}
              {currentStage === "cetak" && (
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => updateStage("selesai")}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Tandai Selesai
                </Button>
              )}

              {/* Jika selesai */}
              {currentStage === "selesai" && (
                <Badge className="bg-green-100 text-green-700 border border-green-200">
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