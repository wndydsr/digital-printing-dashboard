"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Truck, MapPin, Eye } from "lucide-react"
import { apiFetch } from "@/lib/api"

export default function KurirDashboard() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchKurirOrders = async () => {
      try {
        const data = await apiFetch("/orders")
        
        const result = Array.isArray(data)
          ? data
          : Array.isArray(data.data)
          ? data.data
          : []
        
        // 🌟 FILTER DATABASE DINAMIS: Mengambil stage 4 (Cetak/Siap Antar) DAN stage 5 (Selesai)
        const kurirJob = result.filter((order: any) => 
          order.shipping_method === "delivery" && [4, 5].includes(order.current_stage_id)
        )

        setOrders(kurirJob)
      } catch (err) {
        console.error("Gagal memuat tugas kurir:", err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchKurirOrders()
  }, [])
  
  if (loading) return <div className="p-8 text-center text-sm text-gray-500">Memuat data tugas kurir...</div>;

  return (
    <div className="min-h-screen bg-slate-100 p-4 pb-10 max-w-md mx-auto">
      <header className="mb-6 pt-4">
        <h1 className="text-xl font-black text-gray-800 flex items-center gap-2">
          <Truck className="text-blue-600" /> Antrean Kurir Prinora
        </h1>
        <p className="text-xs text-gray-500">Daftar barang siap kirim ke lokasi koordinat peta</p>
      </header>

      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="bg-white p-6 rounded-xl text-center text-xs text-gray-400 border border-dashed border-slate-300">
            Belum ada tugas pengantaran dari admin cetak saat ini.
          </div>
        ) : (
          orders.map((order) => {
            const isFinished = order.current_stage_id === 5;
            
            return (
              <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/60 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono font-bold text-gray-400">
                    ORD-{String(order.id).padStart(5, "0")}
                  </span>
                  {/* 🔥 BADGE STATUS DINAMIS DI DASHBOARD KURIR (KUNING VS HIJAU) */}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    isFinished 
                      ? "bg-green-100 text-green-700" 
                      : "bg-amber-100 text-amber-700 animate-pulse"
                  }`}>
                    {isFinished ? "Selesai" : "Siap Kirim"}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-800">{order.customer?.name || "-"}</h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 shrink-0 text-slate-400" /> {order.customer?.address || "Lihat Koordinat"}
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-3 flex justify-end">
                  <Link
                    href={`/kurir/orders/${order.id}`}
                    className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-4 rounded-lg shadow-xs transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> Buka Peta Rute
                  </Link>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}