"use client"

import { useEffect, useState } from "react"
import { Upload, FileText, Loader2, ArrowLeft, Download } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DesainerLayout } from "@/components/layout/DesainerLayout"
// 🛠️ TAMBAH useSearchParams UNTUK DETEKSI PRODUK YANG DI-KLIK DESAINER
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { apiFetch } from "@/lib/api"

export default function DetailPesananPage() {
  const [file, setFile] = useState<File | null>(null)
  const [revisi, setRevisi] = useState("")
  const [showRevisi, setShowRevisi] = useState(false)
  const [order, setOrder] = useState<any>(null)
  const [activeItem, setActiveItem] = useState<any>(null) // 🛠️ STATE UNTUK MENAMPUNG 1 ITEM AKTIF
  const [isUploading, setIsUploading] = useState(false)
  
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()

  // ─── 🛠️ AMBIL QUERY ITEM ID DARI URL (CONTOH: ?item=5) ───
  const itemId = searchParams.get("item")

  // ─── 🛠️ FIX PARSE JSON ARRAY AGAR NAMA FILE UTUH DARI ACTIVE ITEM ───
  const designFiles = (() => {
    if (!activeItem) return []
    
    const designFile = activeItem.design?.design_file ? [activeItem.design.design_file] : []
    const rawRefFiles = activeItem.design?.reference_files || []
    
    let referenceFiles: string[] = []
    
    // Jika data dari DB berbentuk string JSON "[file1.jpg, ...]", kita bongkar jadi array objek
    if (typeof rawRefFiles === "string") {
      try {
        referenceFiles = JSON.parse(rawRefFiles)
      } catch (e) {
        referenceFiles = [rawRefFiles]
      }
    } else {
      referenceFiles = rawRefFiles
    }

    return [...designFile, ...referenceFiles]
  })()

  // =========================
  // HANDLE DOWNLOAD
  // =========================
  const handleDownload = async (filepath: string) => {
    const cleanPath = filepath.replace(/^\/?storage\//, "")
    const token = localStorage.getItem("token") // sesuaikan dengan key token kamu

    const response = await fetch(`https://api.prinora.store/api/download/design/${cleanPath}`, {
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
  // HANDLE UPLOAD DESIGN
  // =========================
   const handleUploadDesign = async () => {
    if (!file || !params?.id) {
      alert("Silakan pilih file terlebih dahulu!")
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("sender", "desainer")
      formData.append("file", file)
      // 🔥 FIX: Disamakan persis dengan isi pesan payload dari halaman obrolan
      formData.append("message", "Mengirim berkas pratinjau desain terbaru untuk Anda periksa.")
      // formData.append("is_design", "1")
      // if (itemId) formData.append("order_item_id", itemId)


      await apiFetch(`/orders/${params.id}/messages`, {
        method: "POST",
        body: formData,
      })

      setFile(null)
      // Langsung arahkan ke halaman chat diskusi agar desainer bisa melanjutkan obrolan
      router.push(`/desainer/chat/${params.id}?item=${itemId || activeItem?.id || ""}`)
      } catch (err) {
        console.error("Gagal mengunggah desain:", err)
        alert("Gagal mengunggah berkas desain ke ruang obrolan.")
      } finally {
        setIsUploading(false)
      }
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
  const itemDetails = typeof activeItem.details === "string" 
    ? JSON.parse(activeItem.details) 
    : activeItem.details || {}

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

        {/* CARD INPUT UPLOAD PROGRESS DESAIN */}
        <Card className="shadow-sm border-slate-200/80 rounded-xl">
          <CardHeader className="py-3 px-4 border-b bg-slate-50/50 rounded-t-xl">
            <CardTitle className="text-sm font-bold text-slate-700">Unggah File Hasil Desain</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <Input
              type="file"
              accept="image/*"
              className="cursor-pointer file:text-purple-700 file:bg-purple-50 file:border-none file:text-xs text-xs h-9 rounded-lg"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />

            {file && (
              <div className="text-[11px] font-mono text-purple-600 bg-purple-50/60 p-2 rounded-lg border border-purple-100">
                Siap dikirim: {file.name}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 rounded-lg"
                onClick={() => setShowRevisi(true)}
              >
                Catatan Internal
              </Button>

              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-xs h-8 font-bold"
                onClick={handleUploadDesign}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 size={13} className="animate-spin mr-1.5" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Upload size={13} className="mr-1.5" />
                    Upload & Kirim ke Client
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* MODAL OVERLAY CATATAN REVISI INTERNAL */}
        {showRevisi && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-5 rounded-xl w-full max-w-sm space-y-3 shadow-xl">
              <div>
                <h2 className="font-bold text-sm text-slate-800">Catatan Tambahan Internal</h2>
                <p className="text-[11px] text-slate-400">Pencatatan log perubahan revisi pengerjaan.</p>
              </div>

              <textarea
                className="w-full border rounded-lg p-2 text-xs text-slate-700 focus:outline-none focus:border-purple-500 h-20 resize-none"
                placeholder="Contoh: Font judul poster disesuaikan menjadi bold..."
                value={revisi}
                onChange={(e) => setRevisi(e.target.value)}
              />

              <div className="flex justify-end gap-2 text-xs font-bold">
                <Button variant="ghost" size="sm" onClick={() => setShowRevisi(false)}>
                  Batal
                </Button>
                <Button
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 px-4"
                  onClick={() => {
                    setShowRevisi(false)
                    setRevisi("")
                  }}
                >
                  Simpan
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DesainerLayout>
  )
}