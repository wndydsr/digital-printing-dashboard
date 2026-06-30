"use client"

import { useState, useRef } from "react"
import { useReactToPrint } from "react-to-print"

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

  const [deliveryMethod, setDeliveryMethod] =
    useState("")

  const [paymentMethod, setPaymentMethod] =
    useState("")

  const [confirmationDone, setConfirmationDone] =
    useState(false)

  const [showInvoice, setShowInvoice] =
    useState(false)

  const [realOrderId, setRealOrderId] = useState<string>("")

  const [savedCustomer, setSavedCustomer] = useState<any>(null)
  const [savedProducts, setSavedProducts] = useState<any[]>([])
  const [savedTotal, setSavedTotal] = useState<number>(0)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // =========================
  // STEP STATUS
  // =========================

  const shippingDone =
    deliveryMethod !== ""

  const paymentDone =
    paymentMethod !== ""

  // =========================
  // PRINT
  // =========================

  const invoiceRef =
    useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({
    contentRef: invoiceRef,
  })

  const handleSubmit = async () => {
    // Pencegahan darurat jika fungsi terpanggil lewat enter key/cara lain saat loading
    if (isSubmitting) return 

    if (!deliveryMethod) {
      return alert("Pilih delivery dulu")
    }

    if (!paymentMethod) {
      return alert("Pilih payment dulu")
    }

    try {
      setIsSubmitting(true) // 🛠️ 1. NYALAKAN LOCK LOADING DI SINI

      setSavedCustomer(customer)
      setSavedProducts(products)
      setSavedTotal(total)

      setConfirmationDone(true)

      const responseData = await onConfirm()
      
      const idDariDatabase = responseData?.data?.id || responseData?.id || responseData?.data?.no_pesanan;
      
      if (!idDariDatabase) {
        alert("Pesanan berhasil dibuat, tapi nomor urut database gagal dimuat.")
      }

      const formattedOrderNo = idDariDatabase 
        ? `ORD-${String(idDariDatabase).padStart(5, '0')}`
        : `ORD-UNKNOWN`
      
      setRealOrderId(formattedOrderNo)
      setShowInvoice(true)
    } catch (error) {
      console.error("Gagal konfirmasi pesanan:", error)
      setConfirmationDone(false)
    } finally {
      setIsSubmitting(false) // 🛠️ 2. MATIKAN LOCK JIKA SANG INDUK SELESAI/GAGAL RESPONS
    }
  }

  const StepSection = () => (
    <div className="bg-white border rounded-xl p-5 flex items-center">

      <div
        className={`flex items-center gap-2 text-sm font-semibold ${
          shippingDone
            ? "text-blue-600"
            : "text-gray-400"
        }`}
      >

        <div
          className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
            shippingDone
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-500"
          }`}
        >
          {shippingDone ? "✓" : "1"}
        </div>
        SHIPPING
      </div>

      <div
        className={`flex-1 h-px mx-3 ${
          shippingDone
            ? "bg-blue-600"
            : "bg-gray-200"
        }`}
      />

      <div
        className={`flex items-center gap-2 text-sm font-semibold ${
          paymentDone
            ? "text-blue-600"
            : "text-gray-400"
        }`}
      >

        <div
          className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
            paymentDone
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-500"
          }`}
        >
          {paymentDone ? "✓" : "2"}
        </div>

        PAYMENT

      </div>

      {/* LINE */}
      <div
        className={`flex-1 h-px mx-3 ${
          paymentDone
            ? "bg-blue-600"
            : "bg-gray-200"
        }`}
      />

      {/* CONFIRM */}
      <div
        className={`flex items-center gap-2 text-sm font-semibold ${
          confirmationDone
            ? "text-blue-600"
            : "text-gray-400"
        }`}
      >

        <div
          className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
            confirmationDone
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-500"
          }`}
        >
          {confirmationDone ? "✓" : "3"}
        </div>

        CONFIRMATION

      </div>

    </div>
  )


  const DeliverySection = () => (
    <div className="space-y-4">

      <div>
        <h2 className="text-lg font-semibold">
          Select delivery method
        </h2>

        <p className="text-sm text-gray-400">
          Choose delivery or pickup
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">

        <button
          onClick={() =>
            setDeliveryMethod("delivery")
          }
          className={`border rounded-xl p-4 transition-all ${
            deliveryMethod === "delivery"
              ? "border-blue-600 border-2 bg-blue-50"
              : "hover:border-gray-400"
          }`}
        >

          <div className="font-semibold">
            Delivery
          </div>

          <div className="text-xs text-gray-400 mt-1">
            Sent to customer address
          </div>

        </button>

        <button
          onClick={() =>
            setDeliveryMethod("pickup")
          }
          className={`border rounded-xl p-4 transition-all ${
            deliveryMethod === "pickup"
              ? "border-blue-600 border-2 bg-blue-50"
              : "hover:border-gray-400"
          }`}
        >

          <div className="font-semibold">
            Pickup
          </div>

          <div className="text-xs text-gray-400 mt-1">
            Take directly at store
          </div>

        </button>

      </div>

    </div>
  )

  const PaymentSection = () => (
    <div className="space-y-4">

      <div>
        <h2 className="text-lg font-semibold">
          Select payment method
        </h2>

        <p className="text-sm text-gray-400">
          Choose payment method
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">

        <button
          onClick={() =>
            setPaymentMethod("qris")
          }
          className={`border rounded-xl p-4 transition-all ${
            paymentMethod === "qris"
              ? "border-blue-600 border-2 bg-blue-50"
              : "hover:border-gray-400"
          }`}
        >

          <div className="font-semibold">
            QRIS
          </div>

          <div className="text-xs text-gray-400 mt-1">
            Scan QR code payment
          </div>

        </button>

        <button
          onClick={() =>
            setPaymentMethod("cash")
          }
          className={`border rounded-xl p-4 transition-all ${
            paymentMethod === "cash"
              ? "border-blue-600 border-2 bg-blue-50"
              : "hover:border-gray-400"
          }`}
        >

          <div className="font-semibold">
            Cash
          </div>

          <div className="text-xs text-gray-400 mt-1">
            Pay directly with cash
          </div>

        </button>

      </div>

    </div>
  )

  const QRISSection = () => (
    <div className="bg-gray-50 border rounded-2xl p-6">

      <div className="flex flex-col items-center">

        <img
          src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=DummyPaymentGateway"
          alt="QRIS"
          className="w-[220px] h-[220px] rounded-xl border"
        />

        <div className="text-center mt-5">

          <h3 className="font-semibold text-lg">
            Scan QRIS
          </h3>

          <p className="text-sm text-gray-400 mt-1">
            Dummy payment gateway sementara
          </p>

        </div>

        <div className="w-full bg-white border rounded-xl p-4 mt-5 text-center">

          <p className="text-sm text-gray-400">
            Total Payment
          </p>

          <p className="text-2xl font-bold text-blue-600 mt-1">
            Rp {total.toLocaleString("id-ID")}
          </p>

        </div>

      </div>

    </div>
  )

  const CashSection = () => (
    <div className="bg-gray-50 border rounded-2xl p-6 text-center">

      <h3 className="font-semibold text-lg">
        Cash Payment
      </h3>

      <p className="text-sm text-gray-400 mt-2">
        Customer will pay directly using cash
      </p>

    </div>
  )

  const SummarySection = () => {
    console.log("Cek isi data products:", products);

    return (
      <div className="bg-gray-50 border rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="font-bold">Order Summary</h2>
          {/* 🔥 NOMOR ORDER DUMMY / DATE.NOW DI SINI SUDAH DIHAPUS TOTAL */}
          <p className="text-sm text-gray-400">Ringkasan item pesanan</p> 
        </div>

        <div className="space-y-3">
          {products
            .filter((p) => p.product_id)
            .map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-500">
                  {item.quantity}x {item.product_name}
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

      {/* PAYMENT MODAL */}
      <Dialog
        open={open}
        onOpenChange={onClose}
      >

        <DialogContent className="max-w-4xl rounded-xl max-h-[90vh] overflow-y-auto">

          <DialogHeader>

            <DialogTitle className="text-xl font-bold">
              Payment Checkout
            </DialogTitle>

          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* LEFT */}
            <div className="md:col-span-2 space-y-6">

              <StepSection />

              <DeliverySection />

              <PaymentSection />

              {paymentMethod === "qris" && (
                <QRISSection />
              )}

              {paymentMethod === "cash" && (
                <CashSection />
              )}

              <div className="flex gap-3">

                <button
                  onClick={onClose}
                  disabled={isSubmitting} // 🛠️ Kunci tombol cancel juga saat loading
                  className="flex-1 border rounded-xl p-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting} // 🛠️ KUNCI TOMBOL CONFIRM
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-4 font-semibold disabled:bg-blue-400 disabled:cursor-not-allowed transition-all"
                >
                  {/* 🛠️ UBAH TEKS TOMBOL BIAR INTERAKTIF */}
                  {isSubmitting ? "Processing Order..." : "Confirm Order"}
                </button>

              </div>

            </div>

            {/* RIGHT */}
            <div>

              <SummarySection />

            </div>

          </div>

        </DialogContent>

      </Dialog>

      {/* INVOICE MODAL */}
     <Dialog open={showInvoice} onOpenChange={setShowInvoice}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl">
          <DialogHeader>
            <DialogTitle>Invoice Order</DialogTitle>
          </DialogHeader>

          {/* 🛠️ PASANG HIDEBUTTON DI SINI */}
          <InvoiceOrder
            ref={invoiceRef}
            orderId={realOrderId}
            customer={savedCustomer || customer}
            products={savedProducts.length > 0 ? savedProducts : products}
            total={savedTotal || total}
            deliveryMethod={deliveryMethod}
            paymentMethod={paymentMethod}
            hideButton={true} 
          />

          {/* SEKARANG HANYA ADA SATU SET TOMBOL DI SINI */}
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