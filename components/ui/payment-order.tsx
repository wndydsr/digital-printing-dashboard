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
  onConfirm: () => Promise<void>

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

  // =========================
  // STATE
  // =========================

  const [deliveryMethod, setDeliveryMethod] =
    useState("")

  const [paymentMethod, setPaymentMethod] =
    useState("")

  const [confirmationDone, setConfirmationDone] =
    useState(false)

  const [showInvoice, setShowInvoice] =
    useState(false)

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

  // =========================
  // SUBMIT
  // =========================

  const handleSubmit = async () => {

    if (!deliveryMethod) {
      return alert("Pilih delivery dulu")
    }

    if (!paymentMethod) {
      return alert("Pilih payment dulu")
    }

    setConfirmationDone(true)

    await onConfirm()

    setShowInvoice(true)
  }

  // =========================
  // STEP SECTION
  // =========================

  const StepSection = () => (
    <div className="bg-white border rounded-xl p-5 flex items-center">

      {/* SHIPPING */}
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

      {/* LINE */}
      <div
        className={`flex-1 h-px mx-3 ${
          shippingDone
            ? "bg-blue-600"
            : "bg-gray-200"
        }`}
      />

      {/* PAYMENT */}
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

  // =========================
  // DELIVERY SECTION
  // =========================

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

  // =========================
  // PAYMENT SECTION
  // =========================

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

  // =========================
  // QRIS SECTION
  // =========================

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

  // =========================
  // CASH SECTION
  // =========================

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

  // =========================
  // SUMMARY
  // =========================

  const SummarySection = () => (
    <div className="bg-gray-50 border rounded-2xl p-5 space-y-4">

      <div>
        <h2 className="font-bold">
          Order Summary
        </h2>

        <p className="text-sm text-gray-400">
          #{Date.now()}
        </p>
      </div>

      <div className="space-y-3">

        {products
          .filter((p) => p.product_id)
          .map((item) => (

            <div
              key={item.id}
              className="flex justify-between text-sm"
            >

              <span className="text-gray-500">
                {item.quantity}x {item.product_name}
              </span>

              <span className="font-medium">
                Rp {(
                  item.price * item.quantity
                ).toLocaleString("id-ID")}
              </span>

            </div>
          ))}

      </div>

      <div className="border-t pt-4 flex justify-between items-center">

        <span className="font-semibold">
          Total
        </span>

        <span className="text-2xl font-black text-blue-600">
          Rp {total.toLocaleString("id-ID")}
        </span>

      </div>

    </div>
  )

  // =========================
  // RENDER
  // =========================

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
                  className="flex-1 border rounded-xl p-4"
                >
                  Cancel
                </button>

                <button
                  onClick={handleSubmit}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-4 font-semibold"
                >
                  Confirm Order
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
      <Dialog
        open={showInvoice}
        onOpenChange={setShowInvoice}
      >

        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl">

          <DialogHeader>

            <DialogTitle>
              Invoice Order
            </DialogTitle>

          </DialogHeader>

          <InvoiceOrder
            ref={invoiceRef}
            orderId={`ORD-${Date.now()}`}
            customer={customer}
            products={products}
            total={total}
            deliveryMethod={deliveryMethod}
            paymentMethod={paymentMethod}
          />

          <div className="flex gap-3 mt-5">

            <button
              onClick={() =>
                setShowInvoice(false)
              }
              className="flex-1 border rounded-xl p-4"
            >
              Close
            </button>

            <button
              onClick={() => handlePrint()}
              className="flex-1 bg-blue-600 text-white rounded-xl p-4 font-semibold"
            >
              Print Invoice
            </button>

          </div>

        </DialogContent>

      </Dialog>

    </>
  )
}