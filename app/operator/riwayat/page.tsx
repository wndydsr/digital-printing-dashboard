"use client"

import { useEffect, useState } from "react"
import { CheckCircle, Eye } from "lucide-react"

import { OperatorLayout } from "@/components/layout/OperatorLayout"
import { apiFetch } from "@/lib/api"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"

interface FlatRiwayatItem {
  id: number         // ID Order Utama
  item_id: number    // ID Order Item
  order_code: string
  customer_name: string
  order_date: string
  product_name: string
  quantity: number
  stage_name: string
}

export default function RiwayatCetakPage() {
  const [flatItems, setFlatItems] = useState<FlatRiwayatItem[]>([])
  const [loading, setLoading] = useState(true)

  const router = useRouter()

  const stageColorByName: Record<string, string> = {
    "selesai": "text-green-500 border-green-200 bg-green-50/30",
  }

  useEffect(() => {
    const loadOrders = async () => {
      try {
        // 🔥 Operator belum punya endpoint khusus (seperti /designer/orders),
        // jadi tetap fetch dari /orders lalu filter stage "selesai" di sisi frontend
        const data = await apiFetch("/orders")
        const result = Array.isArray(data) ? data : data.data || []

        const flattenedList: FlatRiwayatItem[] = []

        result.forEach((order: any) => {
          if (order.items && order.items.length > 0) {
            order.items.forEach((item: any) => {
              const itemStage = item.stage?.name || order.stage?.name || ""
              const stageLower = itemStage.toLowerCase()

              // 🔥 Hanya item yang sudah "Selesai" produksi cetak yang masuk Riwayat Operator
              if (stageLower === "selesai") {
                flattenedList.push({
                  id: order.id,
                  item_id: item.id,
                  order_code: order.order_code || "-",
                  customer_name: order.customer?.name || "-",
                  order_date: order.order_date,
                  product_name: item.product?.name || "Produk Tanpa Nama",
                  quantity: item.quantity || 1,
                  stage_name: itemStage,
                })
              }
            })
          }
        })

        // Urutkan berdasarkan tanggal terbaru
        flattenedList.sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())

        setFlatItems(flattenedList)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadOrders()
  }, [])

  return (
    <OperatorLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Riwayat Produksi Cetak (Selesai)
            </h1>
            <p className="text-gray-500 mt-1">
              Daftar item produk yang telah selesai diproduksi/dicetak
            </p>
          </div>

          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 px-4 py-1 shadow-none border-none">
            <CheckCircle className="w-4 h-4 mr-1" />
            {flatItems.length} Item Selesai
          </Badge>
        </div>

        {/* Tabel Data */}
        <Card className="w-full border-gray-200">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead className="font-medium text-gray-600">No Pesanan</TableHead>
                  <TableHead className="font-medium text-gray-600">Pelanggan</TableHead>
                  <TableHead className="font-medium text-gray-600">Item Produk</TableHead>
                  <TableHead className="font-medium text-gray-600">Qty</TableHead>
                  <TableHead className="font-medium text-gray-600">Tanggal</TableHead>
                  <TableHead className="font-medium text-gray-600">Tahap</TableHead>
                  <TableHead className="font-medium text-gray-600 text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-gray-500">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : flatItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-gray-500">
                      Belum ada item produk yang selesai diproduksi
                    </TableCell>
                  </TableRow>
                ) : (
                  flatItems.map((item, idx) => (
                    <TableRow key={`${item.item_id}-${idx}`} className="hover:bg-gray-50/80 transition-colors border-b border-gray-100">
                      <TableCell className="font-medium text-blue-600">{item.order_code}</TableCell>
                      <TableCell className="text-gray-700">{item.customer_name}</TableCell>
                      <TableCell className="font-semibold text-gray-900">{item.product_name}</TableCell>
                      <TableCell className="text-gray-600">{item.quantity}x</TableCell>

                      <TableCell className="text-sm text-gray-500">
                        {new Date(item.order_date).toLocaleString("id-ID", {
                          day: "2-digit", month: "2-digit", year: "2-digit",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`rounded-md px-3 py-1 font-normal border ${
                            stageColorByName[item.stage_name.toLowerCase()] || "text-gray-500 border-gray-200 bg-gray-50"
                          }`}
                        >
                          {item.stage_name}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-1"
                            onClick={() => router.push(`/operator/order/${item.id}?item=${item.item_id}`)}
                          >
                            <Eye className="w-4 h-4" />
                            Detail
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </OperatorLayout>
  )
}