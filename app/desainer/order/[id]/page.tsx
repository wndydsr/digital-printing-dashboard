"use client"

import { useEffect, useState } from "react"
import { Upload, FileText, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DesainerLayout } from "@/components/layout/DesainerLayout"
import { useRouter } from "next/navigation"
import { useParams } from "next/navigation"
import { apiFetch } from "@/lib/api"

export default function DetailPesananPage() {
  const [file, setFile] = useState<File | null>(null)
  const [revisi, setRevisi] = useState("")
  const [showRevisi, setShowRevisi] = useState(false)

  const router = useRouter()

 const [order, setOrder] = useState<any>(null)

 const parsed = (() => {
    try {
      return JSON.parse(order?.notes || "{}")
    } catch {
      return {}
    }
  })()

 const params = useParams()

 useEffect(() => {

    const fetchOrder = async () => {
      try {

        const data = await apiFetch(`/orders/${params.id}`)

        setOrder(data)

      } catch (err) {
        console.error(err)
      }
    }

    fetchOrder()

  }, [])

  if (!order) {
    return (
      <DesainerLayout>
        <div className="h-[70vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      </DesainerLayout>
    )
  }

  function formatLabel(key: string) {
    return key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
  }

  return (
    <DesainerLayout>
      <div className="space-y-6">

        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-semibold">Detail Pesanan</h1>
          <p className="text-sm text-gray-500">
            Informasi lengkap dan proses desain
          </p>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* INFO PESANAN */}
          <Card>
            <CardHeader>
              <CardTitle>Informasi Pesanan</CardTitle>
            </CardHeader>
           <CardContent className="space-y-4 text-sm">

              <div className="flex justify-between">
                <span>No Pesanan</span>
                <Badge>{order?.order_code}</Badge>
              </div>

              <div className="flex justify-between">
                <span>Pelanggan</span>
                <span>{order?.customer?.name}</span>
              </div>

              <div className="flex justify-between">
                <span>Produk</span>
                <span>{order?.product?.name}</span>
              </div>

              <div className="flex justify-between">
                <span>Tanggal</span>
                <span>
                  {
                    order?.order_date
                      ? new Date(order.order_date).toLocaleString()
                      : "-"
                  }
                </span>
              </div>

              {/* 🔥 Dynamic Fields */}
              <div className="grid grid-cols-2 gap-3 pt-2">

                {Object.entries(parsed)
                  .filter(
                    ([key]) =>
                      ![
                        "file",
                        "catatan",
                        "reference_file",
                        "reference_files",
                      ].includes(key)
                  )
                  .map(([key, value]) => (

                    <div key={key}>
                      <label className="text-xs text-gray-500">
                        {formatLabel(key)}
                      </label>

                      <div className="border rounded-md p-2 bg-gray-50 mt-1">

                        {Array.isArray(value)
                          ? value.join(", ")
                          : typeof value === "object"
                          ? Object.values(value as object).join(", ")
                          : String(value)}

                      </div>
                    </div>

                  ))}

              </div>

            </CardContent>
          </Card>

          {/* BRIEF */}
          <Card>
            <CardHeader>
              <CardTitle>Brief Pelanggan</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600 whitespace-pre-line">
              {order?.catatan || "Tidak ada brief pelanggan"}
            </CardContent>
          </Card>

        </div>

        {/* FILE PENDUKUNG */}
        <Card>
          <CardHeader>
            <CardTitle>File Pendukung</CardTitle>
          </CardHeader>

          <CardContent className="space-y-2">

            {order?.reference_file?.length > 0 ? (

              order.reference_file.map(
                (file: string, index: number) => (

                  <div
                    key={index}
                    className="flex items-center justify-between p-2 border rounded"
                  >

                    <div className="flex items-center gap-2">
                      <FileText size={16} />

                      <span className="text-sm">
                        {file.split("/").pop()}
                      </span>
                    </div>

                    <a
                      href={`http://127.0.0.1:8000/storage/${file}`}
                      target="_blank"
                    >
                      <Button size="sm" variant="outline">
                        Download
                      </Button>
                    </a>

                  </div>

                )
              )

            ) : (

              <p className="text-sm text-gray-500">
                Tidak ada file pendukung
              </p>

            )}

          </CardContent>
        </Card>

        {/* UPLOAD */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Desain</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            <Input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />

            {file && (
              <p className="text-sm text-blue-500">
                File: {file.name}
              </p>
            )}

            <div className="flex justify-end gap-3">

              <Button
                variant="outline"
                onClick={() => setShowRevisi(true)}
              >
                Tandai Revisi
              </Button>

              <Button className="bg-purple-600 hover:bg-purple-700">
                <Upload size={16} className="mr-2" />
                Upload Desain
              </Button>

            </div>

          </CardContent>
        </Card>

        {/* MODAL REVISI */}
        {showRevisi && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg w-[400px] space-y-4">

              <h2 className="font-semibold text-lg">Catatan Revisi</h2>

              <textarea
                className="w-full border rounded p-2 text-sm"
                placeholder="Masukkan revisi..."
                value={revisi}
                onChange={(e) => setRevisi(e.target.value)}
              />

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowRevisi(false)}>
                  Batal
                </Button>
                <Button
                  onClick={() => {
                    setShowRevisi(false)
                    setRevisi("")
                  }}
                >
                  Kirim
                </Button>
              </div>

            </div>
          </div>
        )}

      </div>
    </DesainerLayout>
  )
}