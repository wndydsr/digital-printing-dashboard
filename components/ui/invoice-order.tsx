"use client"

import { forwardRef } from "react"

interface Props {
  orderId: string
  customer: any
  products: any[]
  total: number
  deliveryMethod: string
  paymentMethod: string
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
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className="bg-white p-8 w-full text-black"
      >
          {/* HEADER */}
        <div className="flex justify-between items-start border-b pb-5">

          <div>
            <h1 className="text-3xl font-black text-blue-600">
              INVOICE
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              #{orderId}
            </p>
          </div>

          <div className="text-right text-sm text-gray-500">
            <p>
              {new Date().toLocaleDateString("id-ID")}
            </p>
          </div>

        </div>

        {/* CUSTOMER */}
        <div className="grid grid-cols-2 gap-6 mt-6">

          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">
              Customer
            </p>

            <div className="mt-2 space-y-1">
              <p className="font-semibold">
                {customer?.name}
              </p>

              <p className="text-sm text-gray-500">
                {customer?.phone}
              </p>

              <p className="text-sm text-gray-500">
                {customer?.address}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">
              Payment Info
            </p>

            <div className="mt-2 space-y-1 text-sm">
              <p>
                Delivery :
                <span className="font-semibold ml-2 capitalize">
                  {deliveryMethod}
                </span>
              </p>

              <p>
                Payment :
                <span className="font-semibold ml-2 uppercase">
                  {paymentMethod}
                </span>
              </p>
            </div>
          </div>

        </div>
   {/* TABLE */}
        <div className="mt-8 border rounded-xl overflow-hidden">

          <div className="grid grid-cols-3 bg-gray-100 p-4 font-bold text-sm">
            <div>Product</div>
            <div className="text-center">Qty</div>
            <div className="text-right">Subtotal</div>
          </div>

          {products.map((item, index) => (
            <div
                key={index}
                className="grid grid-cols-3 p-4 border-t text-sm"
            >

                <div>
                {item.product_name}
                </div>

                <div className="text-center">
                {item.quantity}
                </div>

                <div className="text-right font-medium">
                Rp {(item.price * item.quantity).toLocaleString("id-ID")}
                </div>

            </div>
            ))}

        </div>

        {/* TOTAL */}
        <div className="flex justify-end mt-6">

          <div className="w-[280px] bg-gray-50 border rounded-xl p-5">

            <div className="flex justify-between items-center">
              <span className="font-semibold">
                Total
              </span>

              <span className="text-2xl font-black text-blue-600">
                Rp {total.toLocaleString("id-ID")}
              </span>
            </div>

          </div>

        </div>

        {/* FOOTER */}
        <div className="mt-12 text-center text-xs text-gray-400">
          Terima kasih telah melakukan pemesanan
        </div>

      </div>
    )
  }
)

InvoiceOrder.displayName = "InvoiceOrder"

export default InvoiceOrder