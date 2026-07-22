"use client"

import { useEffect, useState, useRef } from "react"
import { useReactToPrint } from "react-to-print"
import { apiFetch } from "@/lib/api"
import InvoiceOrder from "@/components/ui/invoice-order"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: () => Promise<any>

  customer: any
  products: any[]
  total: number
}

export default function PaymentModal({
  open,
  onClose,
  onConfirm,
  customer,
  products,
  total,
}: Props) {
  const [paymentMethod, setPaymentMethod] = useState("")
  const [confirmationDone, setConfirmationDone] = useState(false)
  const [showInvoice, setShowInvoice] = useState(false)
  const [realOrderId, setRealOrderId] = useState<string>("")

  const [savedCustomer, setSavedCustomer] = useState<any>(null)
  const [savedProducts, setSavedProducts] = useState<any[]>([])
  const [savedTotal, setSavedTotal] = useState<number>(0)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // ==========================================
  // INJEKSI OTOMATIS MIDTRANS SNAP SDK VIA DOM
  // ==========================================
  useEffect(() => {
    const existingScript = document.getElementById("midtrans-snap-script");
    if (existingScript) return;

    const script = document.createElement("script");
    script.id = "midtrans-snap-script";
    script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
    script.setAttribute("data-client-key", process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "");
    script.async = true;
    
    document.body.appendChild(script);

    return () => {};
  }, []);

  // ==========================================
  // STEP STATUS TRACKING
  // ==========================================
  const paymentDone = paymentMethod !== ""

  // ==========================================
  // PRINT HANDLER LOGIC
  // ==========================================
  const invoiceRef = useRef<HTMLDivElement>(null)
  const handlePrint = useReactToPrint({
    contentRef: invoiceRef,
  })

  // ==========================================
  // SUBMIT HANDLER INTEGRASI MIDTRANS & CASH
  // ==========================================
  const handleSubmit = async () => {
    if (isSubmitting) return 

    if (!paymentMethod) {
      return alert("Pilih metode pembayaran terlebih dahulu")
    }

    try {
      setIsSubmitting(true) 

      setSavedCustomer(customer)
      setSavedProducts(products)
      setSavedTotal(total)

      // 1. Eksekusi pembuat order utama di backend (PaymentController@checkout)
      const responseData = await onConfirm();

      console.log("RAW RESPONSE DATA DARI ONCONFIRM:", responseData);

      const idDariDatabase = responseData?.order_id || responseData?.data?.id || responseData?.id;
      const midtransSnapToken = responseData?.token || responseData?.data?.token;

      if (!idDariDatabase) {
        alert("Pesanan gagal diproses: Nomor order tidak ditemukan.");
        setIsSubmitting(false);
        return;
      }

      const formattedOrderNo = `ORD-${String(idDariDatabase).padStart(5, '0')}`;
      setRealOrderId(formattedOrderNo);

      // Jalur A: Gateway Online (QRIS / Midtrans Snap)
      if (paymentMethod === "qris") {
        if (!midtransSnapToken || !(window as any).snap) {
          alert(`Sistem pembayaran online belum siap.\nDetail -> Token: ${midtransSnapToken ? 'Ada' : 'Kosong'}, SDK Midtrans: ${(window as any).snap ? 'Siap' : 'Belum Dimuat Browser'}`);
          setIsSubmitting(false);
          return;
        }
        
        (window as any).snap.pay(midtransSnapToken, {
          onSuccess: async function (result: any) {
            alert("Pembayaran Online Berhasil!");

            // Update stage melalui endpoint /admin/orders/{id}/stage
            try {
              const anyNeedDesign = products.some((p) => p.need_design === true || p.need_design === "1");
              const targetStage = anyNeedDesign ? 6 : 2; // 6 = Antrean Desain, 2 = Siap Cetak

              await apiFetch(`/admin/orders/${idDariDatabase}/stage`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ current_stage_id: targetStage }),
              });
            } catch (e) {
              console.error("Gagal update stage setelah bayar online:", e);
            }

            setConfirmationDone(true);
            setShowInvoice(true);
            onClose();
          },
          onPending: function (result: any) {
            alert("Menunggu pembayaran diselesaikan oleh customer.");
            setConfirmationDone(true);
            setShowInvoice(true);
            onClose();
          },
          onError: function (result: any) {
            alert("Transaksi pembayaran gagal.");
            setConfirmationDone(false);
          },
          onClose: function () {
            setIsSubmitting(false);
          }
        });

      } else {
        // Jalur B: Cash (Tunai) di Kasir
        // Karena uang tunai diterima langsung di tempat, kita update stage pesanan langsung
        try {
          const anyNeedDesign = products.some((p) => p.need_design === true || p.need_design === "1" || p.need_design === 1);
          
          // Stage 6 = Antrean Desain (jika ada item butuh desain)
          // Stage 2 = Siap Cetak (jika tidak ada item yang butuh desain)
          const targetStage = anyNeedDesign ? 6 : 2;

          // 🌟 PERBAIKAN ROUTE: Menambahkan prefix '/admin' agar sesuai routes/api.php
          await apiFetch(`/admin/orders/${idDariDatabase}/stage`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ current_stage_id: targetStage }),
          });

        } catch (e) {
          console.error("Gagal update stage transaksi tunai:", e);
          alert("Pesanan tercatat, tetapi gagal memperbarui stage pesanan secara otomatis.");
        }

        alert("Pembayaran tunai berhasil diproses!");
        setConfirmationDone(true);
        setShowInvoice(true);
        onClose(); // Menutup modal checkout & memicu reload tabel pesanan
      }

    } catch (error) {
      console.error("Gagal konfirmasi pesanan:", error)
      setConfirmationDone(false)
    } finally {
      setIsSubmitting(false) 
    }
  }

  // ==========================================
  // RENDERING SECTIONS COMPONENT
  // ==========================================
  const StepSection = () => (
    <div className="bg-white border rounded-xl p-5 flex items-center">
      <div className={`flex items-center gap-2 text-sm font-semibold ${paymentDone ? "text-blue-600" : "text-gray-400"}`}>
        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${paymentDone ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"}`}>
          {paymentDone ? "✓" : "1"}
        </div>
        PAYMENT
      </div>

      <div className={`flex-1 h-px mx-3 ${paymentDone ? "bg-blue-600" : "bg-gray-200"}`} />

      <div className={`flex items-center gap-2 text-sm font-semibold ${confirmationDone ? "text-blue-600" : "text-gray-400"}`}>
        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${confirmationDone ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"}`}>
          {confirmationDone ? "✓" : "2"}
        </div>
        CONFIRMATION
      </div>
    </div>
  )

  const PaymentSection = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Select payment method</h2>
        <p className="text-sm text-gray-400">Choose payment method</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setPaymentMethod("qris")}
          className={`border rounded-xl p-4 transition-all ${paymentMethod === "qris" ? "border-blue-600 border-2 bg-blue-50" : "hover:border-gray-400"}`}
        >
          <div className="font-semibold">Gateway Online (QRIS/VA)</div>
          <div className="text-xs text-gray-400 mt-1">Scan QR or Online Bank Transfer</div>
        </button>

        <button
          onClick={() => setPaymentMethod("cash")}
          className={`border rounded-xl p-4 transition-all ${paymentMethod === "cash" ? "border-blue-600 border-2 bg-blue-50" : "hover:border-gray-400"}`}
        >
          <div className="font-semibold">Cash (Tunai)</div>
          <div className="text-xs text-gray-400 mt-1">Pay directly with cash at cashier</div>
        </button>
      </div>
    </div>
  )

  const QRISSection = () => (
    <div className="bg-gray-50 border rounded-2xl p-6 text-center">
      <h3 className="font-semibold text-lg">Midtrans Online Payment</h3>
      <p className="text-sm text-gray-400 mt-2">
        Pop-up gerbang pembayaran Midtrans resmi akan diluncurkan sesaat setelah Anda menekan tombol Confirm Order.
      </p>
      <div className="w-full bg-white border rounded-xl p-4 mt-5 text-center">
        <p className="text-sm text-gray-400">Total Tagihan</p>
        <p className="text-2xl font-bold text-blue-600 mt-1">Rp {total.toLocaleString("id-ID")}</p>
      </div>
    </div>
  )

  const CashSection = () => (
    <div className="bg-gray-50 border border-green-200 rounded-2xl p-6 text-center bg-green-50/50">
      <h3 className="font-semibold text-lg text-green-900">Pembayaran Tunai (Cash)</h3>
      <p className="text-sm text-green-700 mt-2">
        Uang diterima langsung dari pelanggan di kasir. Setelah mengonfirmasi, pesanan akan langsung diproses ke tahap pengerjaan (Antrean Desain / Siap Cetak).
      </p>
      <div className="w-full bg-white border rounded-xl p-4 mt-4 text-center">
        <p className="text-sm text-gray-400">Total Pembayaran Tunai</p>
        <p className="text-2xl font-bold text-green-600 mt-1">Rp {total.toLocaleString("id-ID")}</p>
      </div>
    </div>
  )

  const SummarySection = () => {
    return (
      <div className="bg-gray-50 border rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="font-bold">Order Summary</h2>
          <p className="text-sm text-gray-400">Ringkasan item pesanan</p> 
        </div>

        <div className="space-y-3">
          {products
            .filter((p) => p.product_id || p.id)
            .map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-500">
                  {item.quantity}x {item.product_name || item.name || "Item"}
                </span>
                <span className="font-medium">
                  Rp {((Number(item.price) || 0) * (Number(item.quantity) || 0)).toLocaleString("id-ID")}
                </span>
              </div>
            ))}
        </div>

        <div className="border-t pt-4 flex justify-between items-center">
          <span className="font-semibold">Total</span>
          <span className="text-2xl font-black text-blue-600">
            Rp {total.toLocaleString("id-ID")}
          </span>
        </div>
      </div>
    )
  }
    
  return (
    <>
      {/* CHECKOUT SETUP DIALOG MODAL */}
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl rounded-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Payment Checkout</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* SISI KIRI CONTROLS */}
            <div className="md:col-span-2 space-y-6">
              <StepSection />
              <PaymentSection />

              {paymentMethod === "qris" && <QRISSection />}
              {paymentMethod === "cash" && <CashSection />}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isSubmitting} 
                  className="flex-1 border rounded-xl p-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting} 
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-4 font-semibold disabled:bg-blue-400 disabled:cursor-not-allowed transition-all"
                >
                  {isSubmitting ? "Processing Order..." : "Confirm Order"}
                </button>
              </div>
            </div>

            {/* SISI KANAN BILLING SUMMARY */}
            <div>
              <SummarySection />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* FINAL INVOICE PRINTER MODAL */}
      <Dialog open={showInvoice} onOpenChange={setShowInvoice}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl">
          <DialogHeader>
            <DialogTitle>Invoice Order</DialogTitle>
          </DialogHeader>

          <InvoiceOrder
            ref={invoiceRef}
            orderId={realOrderId}
            customer={savedCustomer || customer}
            products={savedProducts.length > 0 ? savedProducts : products}
            total={savedTotal || total}
            paymentMethod={paymentMethod}
            hideButton={true} 
          />

          <div className="flex gap-3 mt-5 print:hidden">
            <button
              onClick={() => setShowInvoice(false)}
              className="flex-1 border rounded-xl p-4 hover:bg-gray-50 transition"
            >
              Close
            </button>

            <button
              onClick={() => handlePrint()}
              className="flex-1 bg-blue-600 text-white rounded-xl p-4 font-semibold hover:bg-blue-700 transition"
            >
              Print Invoice
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}