"use client"

import { forwardRef } from "react"
import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  orderId: string
  customer: any
  products: any[]
  total: number
  deliveryMethod?: string // 🌟 Hanya diubah menjadi opsional agar tidak error
  paymentMethod: string
  hideButton?: boolean
}

const InvoiceOrder = forwardRef<HTMLDivElement, Props>(
  (
    {
      orderId,
      customer,
      products,
      total,
      deliveryMethod,
      paymentMethod,
      hideButton = false,
    },
    ref
  ) => {
    const handlePrint = () => {
      window.print()
    }

    return (
      <div className="w-full space-y-4">
        {/* TOMBOL CETAK BAWAAN (JIKA TIDAK DI-HIDE) */}
        {!hideButton && (
          <div className="flex justify-end print:hidden">
            <Button 
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm"
            >
              <Printer className="w-4 h-4" /> Cetak Invoice
            </Button>
          </div>
        )}

        {/* ─── AREA UTAMA INVOICE YANG DI-REF ─── */}
        <div
          ref={ref}
          className="print-container bg-white p-6 w-full text-black border rounded-2xl shadow-sm print:border-none print:shadow-none print:p-0 space-y-6"
        >
          {/* HEADER INVOICE */}
          <div className="border-b pb-4 flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Order Invoice</h2>
              <p className="text-sm text-gray-500 mt-0.5">#{orderId}</p>
            </div>
            <div className="text-right text-xs text-gray-400">
              <p>{new Date().toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>

          {/* INFO PENGIRIMAN & PEMBAYARAN */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50 print:bg-gray-50 border rounded-xl p-4 text-sm">
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Customer Info</p>
              <div className="mt-1.5 space-y-0.5 font-medium text-gray-800">
                <p>{customer?.name || "-"}</p>
                <p className="text-xs text-gray-500 font-normal">{customer?.phone || "-"}</p>
                <p className="text-xs text-gray-500 font-normal line-clamp-1">{customer?.address || "-"}</p>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Payment Details</p>
              <div className="mt-1.5 space-y-1 text-xs font-medium text-gray-700">
                {/* 🌟 Baris ini hanya tampil jika deliveryMethod memiliki isi (tidak kosong/undefined) */}
                {deliveryMethod && (
                  <p className="flex justify-between">
                    <span className="text-gray-400 font-normal">Method:</span>
                    <span className="capitalize text-gray-900">{deliveryMethod}</span>
                  </p>
                )}
                <p className="flex justify-between">
                  <span className="text-gray-400 font-normal">Payment:</span>
                  <span className="uppercase text-blue-600 font-bold">{paymentMethod}</span>
                </p>
              </div>
            </div>
          </div>

          {/* AREA DAFTAR PRODUK */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Items Ordered</p>
            
            <div className="space-y-2.5 max-w-full overflow-hidden">
              {products?.filter((p) => p.product_id || p.product_name).map((item, index) => (
                <div key={index} className="flex justify-between text-sm items-start">
                  <span className="text-gray-600 flex-1 pr-4">
                    <span className="font-semibold text-gray-900 mr-1.5">{item.quantity}x</span> 
                    {item.product_name}
                  </span>
                  <span className="font-medium text-gray-900 shrink-0">
                    Rp {((Number(item.price) || 0) * (Number(item.quantity) || 0)).toLocaleString("id-ID")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* TOTAL AKHIR */}
          <div className="border-t pt-4 flex justify-between items-center">
            <span className="font-semibold text-gray-900">Total</span>
            <span className="text-2xl font-black text-blue-600">
              Rp {Number(total || 0).toLocaleString("id-ID")}
            </span>
          </div>

          {/* FOOTER */}
          <div className="text-center text-xs text-gray-400 pt-4 border-t border-dashed">
            Terima kasih telah melakukan pemesanan
          </div>

          {/* ─── 🛠️ MASUKKAN TAG STYLE DI SINI (Di dalam div Ref) ─── */}
          <style>{`
            @media print {
              html, body {
                background: white !important;
                color: black !important;
                height: auto !important;
                min-height: auto !important;
                overflow: visible !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .print-container {
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
                margin: 0 !important;
                width: 100% !important;
                display: block !important;
              }
              @page {
                size: A4;
                margin: 15mm;
              }
            }
          `}</style>
        </div>

      </div>
    )
  }
)

InvoiceOrder.displayName = "InvoiceOrder"
export default InvoiceOrder