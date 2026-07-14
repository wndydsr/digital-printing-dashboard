"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Navigation, Phone, CheckCircle, Truck, ArrowLeft, Calendar, FileText } from "lucide-react"
import { apiFetch } from "@/lib/api"

export default function KurirOrderDetail() {
  const { id } = useParams()
  const router = useRouter()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [btnLoading, setBtnLoading] = useState(false)

  // Fungsi fetch kita pisah agar bisa dipanggil ulang setelah update sukses
  const fetchDetail = async () => {
    try {
      const data = await apiFetch(`/orders/${id}`)
      setOrder(data)
    } catch (err) {
      console.error("Gagal memuat detail koordinat pengantaran:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) fetchDetail()
  }, [id])

  const handleFinishDelivery = async () => {
    setBtnLoading(true)
    try {
      await apiFetch(`/admin/orders/${id}/stage`, {
        method: "PUT",
        body: JSON.stringify({ 
          current_stage_id: 5 // Target Stage ID 5 untuk status "Selesai"
        }),
      })
      
      alert("Sukses! Pesanan telah dikonfirmasi selesai.");
      // Panggil fetchDetail lagi agar UI lokal langsung tahu statusnya sudah Stage 5
      await fetchDetail()
    } catch (err) {
      console.error(err)
      alert("Gagal memperbarui status pengantaran ke database.")
    } finally {
      setBtnLoading(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-sm text-gray-500">Memuat detail lokasi koordinat...</div>
  if (!order) return <div className="p-8 text-center text-sm text-red-500">Data pesanan tidak ditemukan.</div>

  // 🔥 Cek apakah pesanan sudah berada di stage selesai (5)
  const isFinished = order.current_stage_id === 5

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-24 max-w-md mx-auto space-y-4">
      <button 
        onClick={() => router.push("/kurir")} 
        className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Antrean
      </button>

      {/* Profil Informasi Pelanggan */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200/60 space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs font-mono text-gray-400">ORD-{String(order.id).padStart(5, "0")}</span>
            <h2 className="text-base font-bold text-gray-800 mt-0.5">{order.customer?.name || "-"}</h2>
          </div>
          {/* Badge status dinamis di dalam detail */}
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
            isFinished ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700 animate-pulse"
          }`}>
            {isFinished ? "Selesai" : "Siap Kirim"}
          </span>
        </div>

        <a
          href={`https://wa.me/${order.customer?.phone || ""}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 font-bold px-3 py-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors"
        >
          <Phone className="w-3.5 h-3.5" /> Hubungi via WhatsApp
        </a>
      </div>

      {/* Rute Jalan Pengantaran & Maps */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200/60 space-y-3">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">📍 Titik Tujuan Alamat</h3>
        <p className="text-xs text-gray-600 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
          {order.customer?.address || "Tidak ada detail alamat teks"}
        </p>

        {order.shipping_latitude && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${order.shipping_latitude},${order.shipping_longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-xl flex items-center justify-center gap-2 font-bold text-xs shadow-sm transition-colors"
          >
            <Navigation className="w-4 h-4" /> Buka Rute Google Maps HP
          </a>
        )}
      </div>

      {/* Muatan Barang Bawaan */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200/60 space-y-3">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
          <FileText className="w-3.5 h-3.5 text-blue-500" /> Daftar Muatan Cetak
        </h3>
        <div className="space-y-2">
          {order.items?.map((item: any, idx: number) => (
            <div key={idx} className="bg-slate-50/50 p-2.5 rounded-lg border border-slate-100 flex justify-between items-center text-xs">
              <div>
                <p className="font-bold text-gray-700">{item.product?.name || "-"}</p>
                {Number(item.panjang) > 0 && <p className="text-[10px] text-gray-400 mt-0.5">Ukuran: {item.panjang}x{item.lebar} cm</p>}
              </div>
              <span className="font-bold text-gray-500 bg-white px-2 py-0.5 rounded border">Qty: {item.quantity}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 🔥 TOMBOL AKSIONER KONFIRMASI (OTOMATIS MATI & BERUBAH WARNA JIKA SUDAH STAGE 5) */}
      <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto">
        <button
          disabled={btnLoading || isFinished}
          onClick={handleFinishDelivery}
          className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition-colors text-sm ${
            isFinished 
              ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none" 
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          <CheckCircle className="w-4 h-4" /> 
          {isFinished ? "Pesanan Selesai Diantar" : "Konfirmasi Selesai Diantar"}
        </button>
      </div>
    </div>
  )
}