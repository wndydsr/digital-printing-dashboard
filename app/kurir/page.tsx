"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Truck, MapPin, Eye, Bell } from "lucide-react"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { toast } from "sonner" 

export default function KurirDashboard() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // 🔔 SCRIPT SERVICE WORKER & PUSH NOTIFICATION KURIR
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js')
        .then(() => console.log('Service Worker Kurir Terdaftar'))
        .catch(err => console.error('Gagal daftar SW:', err));
    }
  }, []);

  const handleSubscribe = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const publicVapidKey = 'BDWzqj4GuM73lluGB7b5DTSuEp6OrVWiUS5G6YmEvVOpe0LKHW2Mq3gIyXVRAEfsKCelR2zVESulI8Oaq6VjvkA'; 

      const convertedKey = urlBase64ToUint8Array(publicVapidKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey
      });

      const response = await fetch('https://api.prinora.store/api/push-subscribe', {
        method: 'POST',
        body: JSON.stringify(subscription),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast.success('Web Push Notifikasi Kurir Berhasil Diaktifkan!');
      } else {
        toast.error('Gagal menyimpan langganan ke server.');
      }
    } catch (error) {
      console.error('Error saat subscribe:', error);
      toast.error('Gagal mengaktifkan notifikasi.');
    }
  };

  useEffect(() => {
    const fetchKurirOrders = async () => {
      try {
       const data = await apiFetch("/kurir/orders")
        
        const result = Array.isArray(data)
          ? data
          : Array.isArray(data.data)
          ? data.data
          : []
        
        // 🌟 FILTER DATABASE DINAMIS: Mengambil stage 4 (Cetak/Siap Antar) DAN stage 5 (Selesai)
        const kurirJob = result.filter((order: any) => 
          order.shipping_method === "delivery" && order.current_stage_id === 4
        )

        setOrders(kurirJob)
      } catch (err) {
        console.error("Gagal memuat tugas kurir:", err)
        toast.error("Gagal memuat daftar antrean pengantaran.")
      } finally {
        setLoading(false)
      }
    }
    
    fetchKurirOrders()
  }, [])
  
  if (loading) return <div className="p-8 text-center text-sm text-gray-500">Memuat data tugas kurir...</div>;

  return (
    <div className="min-h-screen bg-slate-100 p-4 pb-10 max-w-md mx-auto">
      {/* Header dengan Tombol Aktifkan Notifikasi & Riwayat */}
      <header className="mb-6 pt-4 flex flex-col gap-3">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h1 className="text-xl font-black text-gray-800 flex items-center gap-2">
              <Truck className="text-blue-600 shrink-0" /> Antrean Kurir Prinora
            </h1>
            <p className="text-xs text-gray-500 mt-1">Daftar barang siap kirim ke lokasi koordinat peta</p>
          </div>
          
          <Link 
            href="/kurir/riwayat" 
            className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-2 rounded-lg transition-colors shrink-0 shadow-xs"
          >
            Riwayat
          </Link>
        </div>

        {/* 🔔 Tombol Aktifkan Notifikasi Kurir */}
        <Button 
          onClick={handleSubscribe} 
          variant="outline" 
          size="sm" 
          className="w-full text-xs font-medium text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100 flex items-center justify-center gap-2"
        >
          <Bell className="w-3.5 h-3.5" /> 🔔 Aktifkan Notifikasi Kurir
        </Button>
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

// Helper pengubah format VAPID Key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}