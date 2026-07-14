"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Calendar, FileText, Hash, User, MapPin, Navigation, RefreshCw, Truck, UserPlus } from "lucide-react"
import { apiFetch } from "@/lib/api"

interface OrderDetailModalProps {
  open: boolean
  onClose: () => void
  order: any
  onOrderUpdated?: () => void 
}

export default function OrderDetailModal({ open, onClose, order, onOrderUpdated }: OrderDetailModalProps) {
  const [loading, setLoading] = useState(false)

  if (!order) return null

  const orderIdVisual = order.id ? `ORD-${String(order.id).padStart(5, "0")}` : "-"

  // Fungsi Aksi Mengubah Stage Menggunakan apiFetch Bawaan
  const handleStageChange = async (newStageId: number) => {
    setLoading(true)
    try {
      await apiFetch(`/admin/orders/${order.id}/stage`, {
        method: "PUT",
        body: JSON.stringify({ current_stage_id: newStageId }),
      })

      alert("Status tahapan pesanan berhasil diperbarui!")
      if (onOrderUpdated) onOrderUpdated() 
      onClose() 
    } catch (error: any) {
      console.error(error)
      alert("Gagal memperbarui status pesanan.")
    } finally {
      setLoading(false)
    }
  }

  // Menugaskan Kurir (Mengaktifkan Flag lokal pengantaran saat di stage Cetak)
  const handleAssignSingleKurir = async () => {
    setLoading(true)
    try {
      // Mengubah stage menjadi 5 agar kurir tahu pesanan ini siap diantar
      await apiFetch(`/admin/orders/${order.id}/stage`, {
        method: "PUT",
        body: JSON.stringify({ current_stage_id: 5 }), 
      })

      alert("Pesanan berhasil diserahkan ke antrean Kurir Utama!")
      if (onOrderUpdated) onOrderUpdated()
      onClose()
    } catch (error: any) {
      console.error(error)
      alert("Gagal menugaskan kurir ke database.")
    } finally {
      setLoading(false)
    }
  }

  const isOrderDelivering = typeof window !== "undefined" && localStorage.getItem(`delivering-${order.id}`)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="p-0 max-w-5xl w-full h-[80vh] overflow-hidden rounded-2xl border-0 shadow-2xl bg-white">
        <DialogTitle className="sr-only">Detail Pesanan</DialogTitle>
        <DialogDescription className="sr-only">Menampilkan rincian data transaksi pesanan pelanggan.</DialogDescription>
        
        <div className="bg-[#f5f6fa] p-6 h-full overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">

            <div className="flex items-start justify-between px-8 pt-7 pb-5">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Detail Pesanan</h1>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={onClose} className="px-5 py-2 rounded-lg border text-sm font-medium hover:bg-slate-50 transition-all">
                  Tutup
                </button>
              </div>
            </div>

            <div className="border-t border-gray-100 mx-8" />

            <div className="flex flex-col md:flex-row gap-6 p-8">

              {/* ── LEFT COLUMN ── */}
              <div className="w-full md:w-64 shrink-0 flex flex-col gap-4">
                
                {/* Data Customer */}
                <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Customer
                  </p>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{order.customer?.name || "-"}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{order.customer?.phone || "-"}</p>
                    {order.customer?.address && (
                      <p className="text-xs text-gray-400 mt-2 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
                        {order.customer.address}
                      </p>
                    )}
                  </div>
                </div>

                {/* FITUR PENGIRIMAN & MAPS */}
                <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Informasi Pengiriman
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Metode</span>
                      <Badge className={`text-[10px] font-bold uppercase border-none px-2 py-0.5 rounded ${
                        order.shipping_method === 'delivery' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {order.shipping_method || 'pickup'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Ongkir</span>
                      <span className="text-xs font-bold text-gray-700">
                        Rp {Number(order.shipping_cost || 0).toLocaleString("id-ID")}
                      </span>
                    </div>

                    {order.shipping_method === "delivery" && order.shipping_latitude && (
                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                        <p className="text-[10px] text-gray-400 leading-tight">
                          Koordinat terdeteksi:<br/>
                          <span className="font-mono">{order.shipping_latitude}, {order.shipping_longitude}</span>
                        </p>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${order.shipping_latitude},${order.shipping_longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium py-2 px-3 rounded-lg transition-all shadow-sm"
                        >
                          <Navigation className="w-3 h-3" /> Buka Google Maps
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* BUTTON TUGASKAN KURIR */}
                {order.shipping_method === "delivery" && order.current_stage_id === 4 && !isOrderDelivering && (
                  <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-2 bg-blue-50/50">
                    <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5" /> Tugas Kurir
                    </p>
                    <button
                      disabled={loading}
                      onClick={handleAssignSingleKurir}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 px-3 rounded-lg shadow-sm flex items-center justify-center gap-1 transition-all"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Serahkan ke Kurir
                    </button>
                  </div>
                )}

                {/* KONTROL TAHAPAN ADMIN */}
                <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" /> Kontrol Tahapan
                  </p>
                  
                  <div className="space-y-2">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 mb-2">
                      <span className="text-[10px] text-gray-400 block mb-0.5">Status Saat Ini</span>
                      <span className="text-xs font-bold text-indigo-700">
                        {isOrderDelivering ? (
                          <span className="text-amber-600 flex items-center gap-1 animate-pulse">
                            <Truck className="w-3.5 h-3.5" /> Sedang Diantar Kurir
                          </span>
                        ) : (
                          order.stage?.name || "Menunggu Pembayaran"
                        )}
                      </span>
                    </div>

                    {/* Siap Cetak (2) -> Cetak (4) */}
                    {order.current_stage_id === 2 && (
                      <button
                        disabled={loading}
                        onClick={() => handleStageChange(4)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 px-4 rounded-lg transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        🖨️ Masuk Proses Cetak
                      </button>
                    )}

                    {/* Cetak (4) -> Selesai (5) */}
                    {order.current_stage_id === 4 && (
                      <button
                        disabled={loading}
                        onClick={() => {
                          if (isOrderDelivering) localStorage.removeItem(`delivering-${order.id}`)
                          handleStageChange(5)
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2.5 px-4 rounded-lg transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        ✅ Konfirmasi Selesai
                      </button>
                    )}

                    {order.current_stage_id === 5 && (
                      <p className="text Abram-[11px] text-emerald-600 text-center font-medium bg-emerald-50 py-1.5 rounded-lg border border-emerald-100">
                        Pesanan Selesai Terproses
                      </p>
                    )}
                  </div>
                </div>

                {/* Detail Identitas Order */}
                <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5" /> Detail Identitas
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-xs text-gray-400">No Pesanan</span>
                      <span className="text-xs font-mono font-bold text-gray-700">{order.order_code || orderIdVisual}</span>
                    </div>
                    <div className="border-t border-dashed border-gray-100" />
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-xs text-gray-400">Total Transaksi</span>
                      <span className="text-xs font-bold text-indigo-600">
                        Rp {Number(order.total_price || 0).toLocaleString("id-ID")}
                      </span>
                    </div>
                    {/* FUNGSI DARI KODE LAMA: Menampilkan Informasi Tanggal */}
                    {order.created_at && (
                      <>
                        <div className="border-t border-dashed border-gray-100" />
                        <div className="flex items-center justify-between py-1.5">
                          <span className="text-xs text-gray-400">Tanggal</span>
                          <span className="text-xs font-medium text-gray-600 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(order.created_at).toLocaleDateString("id-ID")}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* ── RIGHT COLUMN ── */}
              <div className="flex-1 flex flex-col gap-5">
                <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-5">
                  <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-500" /> Daftar Item Pesanan
                  </p>

                  {order.items?.map((item: any, i: number) => (
                    <div key={i} className="border border-slate-200 rounded-xl p-5 bg-slate-50/30 space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 border-none font-bold px-3 py-1 rounded-md text-xs">
                          Item {i + 1}
                        </Badge>
                        <span className="text-xs font-bold text-slate-500">Qty: {item.quantity || 1}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 border border-slate-100 rounded-xl shadow-xs">
                        <div>
                          <label className="block text-[11px] font-medium text-gray-400 mb-1">Nama Produk</label>
                          <p className="text-sm font-semibold text-gray-800">{item.product?.name || "-"}</p>
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-gray-400 mb-1">Catatan Produksi</label>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {item.design?.design_notes || item.catatan || (
                              <span className="text-gray-300 italic">Tidak ada catatan</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* DYNAMIC FIELDS */}
                      {item.details && Object.keys(parseJSON(item.details)).length > 0 && (
                        <div className="bg-white p-4 border border-slate-100 rounded-xl shadow-xs">
                          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Spesifikasi Kustom</label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {Object.entries(parseJSON(item.details)).map(([key, value]: any) => (
                              <div key={key} className="bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                                <span className="block text-[10px] text-gray-400 font-medium">{formatLabel(key)}</span>
                                <span className="text-xs font-bold text-gray-700 block mt-0.5">{formatValue(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* FILE AREA: FILE DESAIN SIAP CETAK */}
                      {item.design?.design_file && (() => {
                        const fileUrl = getFileUrl(item.design.design_file);
                        if (!fileUrl) return null;
                        return (
                          <div className="bg-white p-4 border border-slate-100 rounded-xl shadow-xs space-y-2">
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">File Desain Siap Cetak</label>
                            <div className="relative group w-fit">
                              <img src={fileUrl} className="rounded-lg max-h-[160px] object-cover border border-slate-200 shadow-sm" alt="Hasil Desain" />
                            </div>
                          </div>
                        );
                      })()}

                      {/* FUNGSI DARI KODE LAMA: FILE AREA REFERENCE FILES */}
                      {(() => {
                        const rawFiles = item.design?.reference_files;
                        const files = typeof rawFiles === 'string' 
                          ? JSON.parse(rawFiles) 
                          : (Array.isArray(rawFiles) ? rawFiles : []);
                        
                        if (files.length === 0) return null;

                        return (
                          <div className="bg-white p-4 border border-slate-100 rounded-xl shadow-xs space-y-2">
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                              File Pendukung / Referensi
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {files.map((file: string, idx: number) => {
                                const fileUrl = getFileUrl(file);
                                if (!fileUrl) return null;

                                return (
                                  <img
                                    key={idx}
                                    src={fileUrl}
                                    className="rounded-lg max-h-[120px] w-full object-cover border border-slate-200 shadow-sm"
                                    alt={`Referensi ${idx + 1}`}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ================= HELPERS UTILITY ================= */
function getFileUrl(file: string | null | undefined) {
  if (!file) return null

  // Jika sudah berupa URL lengkap dari backend
  if (file.startsWith("http://") || file.startsWith("https://")) {
    return file
  }

  // Menggunakan domain produksi Prinora yang valid dari kode lama Anda
  const baseUrl = "https://api.prinora.store";
  const cleanPath = file.replace(/^public\//, '');

  if (cleanPath.startsWith("storage/")) {
    return `${baseUrl}/${cleanPath}`
  }

  return `${baseUrl}/storage/${cleanPath}`
}

function parseJSON(data: any) { 
  try { return typeof data === "string" ? JSON.parse(data) : data || {} } catch { return {} } 
}

function formatLabel(key: string) { 
  return key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) 
}

function formatValue(value: any) {
  if (value === null || value === undefined) return "-"
  return typeof value === "object" ? (Array.isArray(value) ? value.join(", ") : Object.values(value).join(", ")) : String(value)
}