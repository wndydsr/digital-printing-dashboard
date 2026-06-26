"use client"

import { useEffect, useState } from "react"
import {
  CheckCircle,
  Eye,
  MessageCircle,
  Download,
} from "lucide-react"

import { DesainerLayout } from "@/components/layout/DesainerLayout"
import { apiFetch } from "@/lib/api"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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

interface Order {
  id: number
  order_code: string
  order_date: string
  created_at: string

  customer?: {
    name: string
  }

  product?: {
    name: string
  }

  stage?: {
    name: string
    status?: {
      name: string
    }
  }
}

export default function RiwayatDesainPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const router = useRouter()

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const data = await apiFetch("/orders")

        const result = Array.isArray(data)
          ? data
          : data.data || []

        // hanya ambil yang selesai
        const filtered = result.filter((o: Order) => {
          return (
            o.stage?.status?.name?.toLowerCase() === "selesai"
          )
        })

        setOrders(filtered)
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
              Riwayat Pesanan
            </h1>

            <p className="text-gray-500 mt-1">
              Semua pesanan yang sudah selesai dikerjakan
            </p>
          </div>

          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 px-4 py-1">
            <CheckCircle className="w-4 h-4 mr-1" />
            {orders.length} Selesai
          </Badge>
        </div>

        {/* Card */}
        <Card className="border-white">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-20">
                  <TableHead>No Pesanan</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-10 text-gray-500"
                    >
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-10 text-gray-500"
                    >
                      Belum ada riwayat pesanan selesai
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow
                      key={order.id}
                      className="hover:bg-gray-50"
                    >
                      {/* Order Code */}
                      <TableCell className="font-medium text-blue-600">
                        {order.order_code}
                      </TableCell>

                      {/* Customer */}
                      <TableCell>
                        {order.customer?.name || "-"}
                      </TableCell>

                      {/* Product */}
                      <TableCell>
                        {order.product?.name || "-"}
                      </TableCell>

                      {/* Date */}
                      <TableCell className="text-sm text-gray-500">
                        {new Date(order.order_date).toLocaleString(
                          "id-ID",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                         <Badge
                            variant="outline"
                            className="rounded-md px-3 py-1 font-normal border text-green-500 border-green-200 bg-green-50/30"
                        >
                            Selesai
                        </Badge>
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          
                          {/* Detail */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              router.push(`/desainer/order/${order.id}`)
                            }
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Detail
                          </Button>

                          {/* Chat */}
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() =>
                              router.push(`/desainer/chat/${order.id}`)
                            }
                          >
                            <MessageCircle className="w-4 h-4 mr-1" />
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