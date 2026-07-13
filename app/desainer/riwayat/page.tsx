"use client"

import { useEffect, useState } from "react"
import {
  CheckCircle,
  Eye,
  MessageCircle,
} from "lucide-react"

import { DesainerLayout } from "@/components/layout/DesainerLayout"
import { apiFetch } from "@/lib/api"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"

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
  id: number         
  order_id: number   
  order_code: string
  customer_name: string
  order_date: string
  product_name: string
  stage_name: string
  status_name: string
}

export default function RiwayatDesainPage() {
  const [flatItems, setFlatItems] = useState<FlatRiwayatItem[]>([])
  const [loading, setLoading] = useState(true)

  const router = useRouter()

  const stageColorByName: Record<string, string> = {
    "siap cetak": "text-yellow-500 border-yellow-200 bg-yellow-50/30",
    "cetak": "text-blue-500 border-blue-200 bg-blue-50/30",
    "selesai": "text-green-500 border-green-200 bg-green-50/30",
  }

  useEffect(() => {
    const loadOrders = async () => {
      try {
        // 🔥 PERBAIKAN: Menambahkan parameter ?status=history agar backend meloloskan item di luar stage [1, 6]
        const data = await apiFetch("/designer/orders?status=history")
        const result = Array.isArray(data) ? data : data.data || []

        const flattenedList: FlatRiwayatItem[] = []

        result.forEach((order: any) => {
          const hasDesigner = order.designer_id || order.designer || order.items?.some((i: any) => i.designer_id || i.designer)
          
          const orderStage = order.stage?.name || ""
          const orderStatus = order.stage?.status?.name || ""

          if (order.items && order.items.length > 0) {
            order.items.forEach((item: any) => {
              const itemStage = item.stage?.name || orderStage
              const itemStatus = item.stage?.status?.name || orderStatus
              const stageLower = itemStage.toLowerCase()

              // Filter lokal untuk memastikan visualisasi data di tabel sudah aman & bersih
              if (["siap cetak", "cetak", "selesai", "produksi"].includes(stageLower) && hasDesigner) {
                flattenedList.push({
                  id: item.id,
                  order_id: order.id,
                  order_code: order.order_code || "-",
                  customer_name: order.customer?.name || "-",
                  order_date: order.order_date,
                  product_name: item.product?.name || "Produk Tanpa Nama",
                  stage_name: itemStage,
                  status_name: itemStatus
                })
              }
            })
          }
        })

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
    <DesainerLayout>
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Riwayat Hasil Desain (Approved)
            </h1>
            <p className="text-gray-500 mt-1">
              Daftar item produk hasil desain Anda yang telah di-approve dan diteruskan ke bagian cetak
            </p>
          </div>

          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 px-4 py-1 shadow-none border-none">
            <CheckCircle className="w-4 h-4 mr-1" />
            {flatItems.length} Desain Di-approve
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
                  <TableHead className="font-medium text-gray-600">Tanggal</TableHead>
                  <TableHead className="font-medium text-gray-600">Tahap Kerja</TableHead>
                  <TableHead className="font-medium text-gray-600 text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : flatItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                      Belum ada hasil desain yang berstatus di-approve
                    </TableCell>
                  </TableRow>
                ) : (
                  flatItems.map((item, idx) => (
                    <TableRow key={`${item.id}-${idx}`} className="hover:bg-gray-50/80 transition-colors border-b border-gray-100">
                      <TableCell className="font-medium text-blue-600">{item.order_code}</TableCell>
                      <TableCell className="text-gray-700">{item.customer_name}</TableCell>
                      <TableCell className="font-semibold text-gray-900">{item.product_name}</TableCell>
                      
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
                            onClick={() => router.push(`/desainer/order/${item.order_id}?item=${item.id}`)}
                          >
                            <Eye className="w-4 h-4" />
                            Detail
                          </Button>

                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 flex items-center gap-1"
                            onClick={() => router.push(`/desainer/chat/${item.order_id}?item=${item.id}`)}
                          >
                            <MessageCircle className="w-4 h-4" />
                            Chat
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
    </DesainerLayout>
  )
}