"use client"

import { useEffect, useState } from "react"
import { Upload, FileText, Loader2, ArrowLeft } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DesainerLayout } from "@/components/layout/DesainerLayout"
import { useRouter, useParams } from "next/navigation"
import { apiFetch } from "@/lib/api"

export default function DetailPesananPage() {
  const [file, setFile] = useState<File | null>(null)
  const [revisi, setRevisi] = useState("")
  const [showRevisi, setShowRevisi] = useState(false)

  const router = useRouter()
  const params = useParams()

  const [order, setOrder] = useState<any>(null)

  const designFiles =
  order?.items?.flatMap((item: any) => {
    const designFile = item.design?.design_file ? [item.design.design_file] : []
    const referenceFiles = item.design?.reference_files || []

    return [...designFile, ...referenceFiles]
  }) || []

  const handleDownload = async (filepath: string) => {
    try {
      const token = localStorage.getItem("token")

      const response = await fetch(
        `http://127.0.0.1:8000/api/download/design/${filepath}`,
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
      a.download = filepath.split("/").pop() || "download"

      document.body.appendChild(a)
      a.click()
      a.remove()

      window.URL.revokeObjectURL(url)

    } catch (err) {
      console.error(err)
    }
  }

  const handleUploadDesign = async () => {
    if (!file) return

    const formData = new FormData()

    formData.append("file", file)
    formData.append("message", "Berikut hasil desain terbaru")
    formData.append("sender", "desainer")

    await fetch(`http://127.0.0.1:8000/api/orders/${params.id}/messages`, {
      method: "POST",
      body: formData,
    })

    router.push(`/desainer/chat/${params.id}`)
  }

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await apiFetch(`/orders/${params.id}`)
        console.log("ORDER DETAIL RESPONSE:", data)
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

  // 🔥 FIX: ambil semua reference_files dari semua item
  const referenceFiles =
  order?.items?.flatMap((item: any) =>
    item.design?.reference_files || []
  ) || []

  return (
    <DesainerLayout>
      <div className="space-y-6">

        {/* HEADER */}
        <div className="flex items-center gap-3">

          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/desainer/antrian")}
          >
            <ArrowLeft size={18} />
          </Button>

          <div>
            <h1 className="text-2xl font-semibold">Detail Pesanan</h1>

            <p className="text-sm text-gray-500">
              Informasi lengkap dan proses desain
            </p>
          </div>

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
                <span>
                  {order?.items?.map((i: any) => i.product?.name).join(", ")}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Tanggal</span>
                <span>
                  {order?.order_date
                    ? new Date(order.order_date).toLocaleString()
                    : "-"}
                </span>
              </div>

            </CardContent>
          </Card>

          {/* BRIEF */}
          <Card>
            <CardHeader>
              <CardTitle>Brief Pelanggan</CardTitle>
            </CardHeader>

            <CardContent className="text-sm text-gray-600 whitespace-pre-line">
              {order?.notes || "Tidak ada brief pelanggan"}
            </CardContent>
          </Card>

        </div>

        {/* FILE PENDUKUNG */}
        <Card>
          <CardHeader>
            <CardTitle>File Pendukung</CardTitle>
          </CardHeader>

          <CardContent className="space-y-2">
            {designFiles.length > 0 ? (
              <div className="space-y-2">
          {designFiles.map((file: string, i: number) => (
            <div
              key={i}
              className="flex items-center justify-between p-2 border rounded-lg bg-white"
            >
              {/* kiri: nama file */}
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={16} className="text-gray-500" />

                <span className="text-sm truncate max-w-[300px]">
                  {file.split("/").pop()}
                </span>
              </div>

              {/* kanan: tombol download */}
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => handleDownload(file)}
              >
                <Upload size={14} />
                Unduh
              </Button>
            </div>
          ))}
        </div>
            ) : (
              <p className="text-sm text-gray-500">
                Tidak ada file desain
              </p>
            )}
          </CardContent>
        </Card>

        {/* UPLOAD DESAIN */}
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

              <Button
                className="bg-purple-600 hover:bg-purple-700"
                onClick={handleUploadDesign}
              >
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