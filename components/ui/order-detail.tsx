"use client"

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Calendar, FileText, Hash, User } from "lucide-react"

interface OrderDetailModalProps {
  open: boolean
  onClose: () => void
  order: any
}

export default function OrderDetailModal({ open, onClose, order }: OrderDetailModalProps) {
  if (!order) return null

  // Format ID Order jika dibutuhkan visual standar
  const orderIdVisual = order.id ? `ORD-${String(order.id).padStart(5, "0")}` : "-"

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="p-0 max-w-5xl w-full h-[80vh] overflow-hidden rounded-2xl border-0 shadow-2xl bg-white">
        <DialogTitle className="sr-only">Detail Pesanan</DialogTitle>
        <DialogDescription className="sr-only">Menampilkan rincian data transaksi pesanan pelanggan.</DialogDescription>
        
        <div className="bg-[#f5f6fa] p-6 h-full overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">

            {/* Heading + Action Buttons */}
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

              {/* ── LEFT COLUMN: Customer + Metadata Ringkasan ── */}
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

              {/* ── RIGHT COLUMN: Item Produk + Spesifikasi Dynamic + Files ── */}
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
                        <span className="text-xs font-bold text-slate-500">
                          Qty: {item.quantity || 1}
                        </span>
                      </div>

                      {/* Spesifikasi Standar */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 border border-slate-100 rounded-xl shadow-xs">
                        <div>
                          <label className="block text-[11px] font-medium text-gray-400 mb-1">Nama Produk</label>
                          <p className="text-sm font-semibold text-gray-800">{item.product?.name || "-"}</p>
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-gray-400 mb-1">Catatan Produksi</label>
                          <p className="text-sm text-gray-600 leading-relaxed">{item.catatan || <span className="text-gray-300 italic">Tidak ada catatan</span>}</p>
                        </div>
                      </div>

                      {/* DYNAMIC FIELDS & ATTRIBUTES */}
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

                      {/* ─── FILE AREA: DESIGN FILE ─── */}
{item.design?.design_file && (() => {
  const fileUrl = getFileUrl(item.design.design_file);
  if (!fileUrl) return null;

  return (
    <div className="bg-white p-4 border border-slate-100 rounded-xl shadow-xs space-y-2">
      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
        File Desain Siap Cetak
      </label>
      <div className="relative group w-fit">
        <img
          src={fileUrl}
          className="rounded-lg max-h-[160px] object-cover border border-slate-200 shadow-sm"
          alt="Hasil Desain"
        />
      </div>
    </div>
  );
})()}

{/* ─── FILE AREA: REFERENCE FILES ─── */}
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

    // Base URL default mengarah ke API produksi Prinora
    const baseUrl = "https://api.prinora.store";

    // Bersihkan dari sisa public/ jika tidak sengaja terbawa
    const cleanPath = file.replace(/^public\//, '');

    // Jika path di database sudah otomatis diawali storage/
    if (cleanPath.startsWith("storage/")) {
      return `${baseUrl}/${cleanPath}`
    }

    // Jika di database tersimpan: designs/xxxxxxxx.png atau orders/xxxxxxx.png
    // Maka URL menjadi: https://api.prinora.store/storage/designs/xxxxxxxx.png
    return `${baseUrl}/storage/${cleanPath}`
  }

  function parseJSON(data: any) {
    try {
      return typeof data === "string" ? JSON.parse(data) : data || {}
    } catch {
      return {}
    }
  }

  function formatLabel(key: string) {
    return key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
  }

  function formatValue(value: any) {
    if (value === null || value === undefined) return "-"
    if (typeof value === "object") {
      return Array.isArray(value) ? value.join(", ") : Object.values(value).join(", ")
    }
    return String(value)
  }