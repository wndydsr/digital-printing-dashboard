"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Calendar, ArrowLeft, CheckCircle2, MapPin, Eye } from "lucide-react"
import { apiFetch } from "@/lib/api"

export default function KurirHistory() {
  const [completedOrders, setCompletedOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await apiFetch("/kurir/orders")
        
        const result = Array.isArray(data)
          ? data
          : Array.isArray(data.data)
          ? data.data
          : []
        
        // 🔥 FILTER KHUSUS: Hanya mengambil metode pengiriman "delivery" DAN stage 5 (Selesai)
        const historyJobs = result.filter((order: any) => 
          order.shipping_method === "delivery" && order.current_stage_id === 5
        )

        setCompletedOrders(historyJobs)
      } catch (err) {
        console.error("Gagal memuat riwayat kurir:", err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchHistory()
  }, [])
  
  if (loading) return <div className="p-8 text-center text-sm text-gray-500">Memuat riwayat pengantaran...</div>

  return (
    <div className="min-h-screen bg-slate-100 p-4 pb-10 max-w-md mx-auto">
      <header className="mb-6 pt-4 flex items-center gap-3">
        <Link href="/kurir" className="p-2 bg-white rounded-lg shadow-xs hover:bg-slate-50 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-gray-800 flex items-center gap-2">
            Riwayat Pengantaran
          </h1>
          <p className="text-xs text-gray-500">Daftar orderan delivery yang telah kamu selesaikan</p>
        </div>
      </header>

      <div className="space-y-4">
        {completedOrders.length === 0 ? (
          <div className="bg-white p-6 rounded-xl text-center text-xs text-gray-400 border border-dashed border-slate-300">
            Belum ada riwayat pengantaran yang diselesaikan.
          </div>
        ) : (
          completedOrders.map((order) => (
            <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/60 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono font-bold text-gray-400">
                  ORD-{String(order.id).padStart(5, "0")}
                </span>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded bg-green-50 text-green-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Selesai
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-800">{order.customer?.name || "-"}</h3>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3 shrink-0 text-slate-400" /> {order.customer?.address || "Alamat tidak tersedia"}
                </p>
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {order.updated_at ? new Date(order.updated_at).toLocaleDateString("id-ID") : "Baru saja"}
                </span>
                <Link
                  href={`/kurir/orders/${order.id}`}
                  className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-gray-700 text-xs font-bold py-1.5 px-3 rounded-lg transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" /> Detail
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}