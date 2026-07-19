"use client"

import { useEffect, useState } from "react"
import { FileText, Loader2, ArrowLeft, Download } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DesainerLayout } from "@/components/layout/DesainerLayout"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { apiFetch } from "@/lib/api"

export default function DetailPesananPage() {
  const [order, setOrder] = useState<any>(null)
  const [activeItem, setActiveItem] = useState<any>(null)
  
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()

  const itemId = searchParams.get("item")

  const designFiles = (() => {
    if (!activeItem) return []
    
    const designFile = activeItem.design?.design_file ? [activeItem.design.design_file] : []
    const rawRefFiles = activeItem.design?.reference_files || []
    
    let referenceFiles: string[] = []
    
    if (typeof rawRefFiles === "string") {
      try {
        referenceFiles = JSON.parse(rawRefFiles)
      } catch (e) {
        referenceFiles = [rawRefFiles]
      }
    } else {
      referenceFiles = rawRefFiles
    }

    const combinedFiles = [...designFile, ...referenceFiles]

    const uniqueFiles = Array.from(
      new Set(
        combinedFiles
         .filter((file) => typeof file === "string" && file.trim() !== "" && file.includes("/"))
      )
    )

    return uniqueFiles
  })()

  // =========================
  // HANDLE DOWNLOAD
  // =========================
  const handleDownload = async (filepath: string) => {
    const cleanPath = filepath.replace(/^\/?storage\//, "")
    const token = localStorage.getItem("token") // sesuaikan dengan key token kamu4

    const safePath = cleanPath.replace(/ /g, "%20")

    const response = await fetch(`https://api.prinora.store/api/download/design/${safePath}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      alert("File tidak ditemukan")
      return
    }

    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = blobUrl
    link.download = cleanPath.split("/").pop() || "download"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
  }

  // =========================
  // LOAD DATA PESANAN
  // =========================
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await apiFetch(`/orders/${params.id}`)
        setOrder(data)

        // ─── 🛠️ ISOLASI DATA HANYA UNTUK ITEM YANG DI-KLIK DESAINER ───
        if (data?.items && itemId) {
          const matchedItem = data.items.find((item: any) => String(item.id) === itemId)
          setActiveItem(matchedItem || data.items[0])
        } else if (data?.items?.length > 0) {
          setActiveItem(data.items[0])
        }
      } catch (err) {
        console.error("Gagal memuat detail pesanan:", err)
      }
    }

    fetchOrder()
  }, [params.id, itemId])

  if (!order || !activeItem) {
    return (
      <DesainerLayout>
        <div className="h-[60vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
        </div>
      </DesainerLayout>
    )
  }

  function formatLabel(key: string) {
    return key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
  }

  // Ambil rincian json kustom detail dari satu produk terpilih
  const itemDetails = (() => {
      if (!activeItem?.details) return {}
      
      try {
        // Jika data berupa string JSON ganda atau tunggal, bongkar secara rekursif
        let parsed = typeof activeItem.details === "string" 
          ? JSON.parse(activeItem.details) 
          : activeItem.details

        if (typeof parsed === "string") {
          parsed = JSON.parse(parsed)
        }
        
        return parsed || {}
      } catch (e) {
        console.error("Gagal memuat atribut spesifikasi cetak desainer:", e)
        return {}
      }
    })()

  return (
    <DesainerLayout>
      <div className="max-w-5xl mx-auto space-y-4 p-2">
        
        {/* HEADER MINI */}
        <div className="flex items-center gap-3 border-b pb-3">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => router.push("/desainer/antrian")}
          >
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Detail Pesanan</h1>
            <p className="text-xs text-slate-500">
              Fokus Kerja: <span className="font-bold text-purple-600">{activeItem.product?.name}</span>
            </p>
          </div>
        </div>

        {/* GRID UTAMA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* CARD INFO PESANAN */}
          <Card className="shadow-sm border-slate-200/80 rounded-xl">
            <CardHeader className="py-3 px-4 border-b bg-slate-50/50 rounded-t-xl">
              <CardTitle className="text-sm font-bold text-slate-700">Informasi Transaksi</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between items-center">
                <span>No. Pesanan</span>
                <Badge className="bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 font-mono text-[11px] px-2 py-0">
                  {order?.order_code}
                </Badge>
              </div>
              <div className="flex justify-between border-b pb-1.5 border-dashed">
                <span>Pelanggan</span>
                <span className="font-semibold text-slate-800">{order?.customer?.name || "-"}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5 border-dashed">
                <span>Target Produk</span>
                <span className="font-bold text-purple-600">
                  {activeItem.product?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tanggal Masuk</span>
                <span className="font-medium text-slate-700">
                  {order?.order_date ? new Date(order.order_date).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "-"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* CARD BRIEF CLIENT */}
          <Card className="shadow-sm border-slate-200/80 rounded-xl flex flex-col">
            <CardHeader className="py-3 px-4 border-b bg-slate-50/50 rounded-t-xl">
              <CardTitle className="text-sm font-bold text-slate-700">Brief Permintaan Pelanggan</CardTitle>
            </CardHeader>
            <CardContent className="p-4 text-xs text-slate-600 whitespace-pre-line leading-relaxed flex-1 bg-white rounded-b-xl">
             {activeItem?.design?.design_notes || activeItem?.catatan || order?.notes || (
                <span className="text-slate-400 italic">Tidak ada catatan instruksi khusus dari pelanggan.</span>
              )}            
              </CardContent>
          </Card>
        </div>

        {/* CARD SPESIFIKASI CETAK */}
        <Card className="shadow-sm border-slate-200/80 rounded-xl">
          <CardHeader className="py-3 px-4 border-b bg-slate-50/50 rounded-t-xl">
            <CardTitle className="text-sm font-bold text-slate-700">Rincian Spesifikasi Cetak: {activeItem.product?.name}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="border border-slate-100 rounded-lg p-3 bg-slate-50/30 space-y-2">
              <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                <p className="font-bold text-xs text-slate-800">{activeItem.product?.name}</p>
                <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0">Qty: {activeItem.quantity || 0} pcs</Badge>
              </div>

              {activeItem.panjang && activeItem.lebar && (
                <div className="flex justify-between text-xs border-b border-slate-100/70 pb-1">
                  <span className="text-slate-400">Ukuran Dimensi</span>
                  <span className="font-semibold text-slate-700">{Number(activeItem.panjang)} x {Number(activeItem.lebar)} meter</span>
                </div>
              )}

              {Object.keys(itemDetails).length > 0 ? (
                Object.entries(itemDetails).map(([key, value]: any) => (
                  <div key={key} className="flex justify-between text-xs border-b border-slate-100/70 pb-1 last:border-none">
                    <span className="text-slate-400">{formatLabel(key)}</span>
                    <span className="font-medium text-slate-700">{String(value)}</span>
                  </div>
                ))
              ) : (
                !activeItem.panjang && <p className="text-[11px] text-slate-400 italic">Tidak ada spesifikasi khusus.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* CARD RIWAYAT FILE */}
        <Card className="shadow-sm border-slate-200/80 rounded-xl">
          <CardHeader className="py-3 px-4 border-b bg-slate-50/50 rounded-t-xl">
            <CardTitle className="text-sm font-bold text-slate-700">Berkas Referensi & Pendukung</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {designFiles.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {designFiles.map((file: string, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 border border-slate-100 rounded-lg bg-slate-50/40">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={15} className="text-slate-400 shrink-0" />
                      <span className="text-xs font-medium truncate text-slate-700 max-w-[180px] sm:max-w-[240px]">
                        {file.split("/").pop()}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-[11px] h-7 px-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-semibold"
                      onClick={() => handleDownload(file)}
                    >
                      <Download size={12} />
                      Unduh
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-2">Belum ada file aset pendukung yang diunggah.</p>
            )}
          </CardContent>
        </Card>

      </div>
    </DesainerLayout>
  )
}