"use client"

import { useState, useEffect } from "react"
import {
  Eye,
  MessageCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"

import { apiFetch } from "@/lib/api"
import { useRouter } from "next/navigation"
import { DesainerLayout } from "@/components/layout/DesainerLayout"

// ─── 🛠️ MODIFIKASI INTERFACE AGAR STRUKTUR DATA UTAMANYA PER ITEM ───
interface OrderItem {
  id: number // ID Item Produk/Detail Order
  order_id: number // ID Induk Pesanan
  order_code: string
  customer_name: string
  order_date: string
  product_name: string
  stage_name: string
  status_name: string
}

interface ApiOrder {
  id: number
  order_code: string
  customer?: { name: string }
  order_date: string
  items?: {
    id: number // ID Item Detail
    product?: { name: string }
    // Tambahkan field stage/status per item jika backend kamu mendukungnya per item produk,
    // Jika tidak, kita bisa fallback menggunakan stage global milik Order-nya.
    stage?: { name: string; status?: { name: string } } 
  }[]
  stage?: {
    name: string
    status?: { name: string }
  }
}

export default function AntrianPage() {
  const [flatItems, setFlatItems] = useState<OrderItem[]>([]) // Menggunakan array hasil pecahan per item
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  const router = useRouter()
  const itemsPerPage = 10

  const stageColorByName: Record<string, string> = {
    "butuh desain": "text-red-500 border-red-200 bg-red-50/30",
    "desain": "text-blue-500 border-blue-200 bg-blue-50/30",
    "revisi": "text-yellow-500 border-yellow-200 bg-yellow-50/30",
    "selesai": "text-green-500 border-green-200 bg-green-50/30",
  }

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-600",
    diproses: "bg-blue-100 text-blue-600",
    revisi: "bg-red-100 text-red-600",
    selesai: "bg-green-100 text-green-600",
  }

  const fetchOrders = async () => {
    try {
      const data = await apiFetch("/designer/orders")
      const result = Array.isArray(data) ? data : data.data || []

      // ─── 🛠️ PROSES FLAT MAP: MEMECAH 1 ORDER MENJADI BEBERAPA BARIS ITEM ───
      const flattenedList: OrderItem[] = []

      result.forEach((order: ApiOrder) => {
        // Ambil info stage global pesanan sebagai fallback
        const orderStage = order.stage?.name || "Butuh Desain"
        const orderStatus = order.stage?.status?.name || "pending"

        if (order.items && order.items.length > 0) {
          order.items.forEach((item) => {
            // Tentukan stage per item jika ada, kalau tidak ada pakai data dari order induk
            const itemStage = item.stage?.name || orderStage
            const itemStatus = item.stage?.status?.name || orderStatus

            // Filter agar hanya item yang butuh penanganan desainer yang masuk list
            const stageLower = itemStage.toLowerCase()
            if (stageLower === "butuh desain" || stageLower === "desain" || stageLower === "revisi") {
              flattenedList.push({
                id: item.id, // ID Item produk untuk keperluan pengerjaan spesifik
                order_id: order.id, // Simpan ID induk untuk routing / chat
                order_code: order.order_code,
                customer_name: order.customer?.name || "-",
                order_date: order.order_date,
                product_name: item.product?.name || "Produk Tanpa Nama",
                stage_name: itemStage,
                status_name: itemStatus,
              })
            }
          })
        }
      })

      setFlatItems(flattenedList)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  // 🔍 SEARCH (Disunting agar langsung mencari properti item hasil pecahan)
  const filteredItems = flatItems.filter((item) => {
    const keyword = search.toLowerCase()
    return (
      item.order_code?.toLowerCase().includes(keyword) ||
      item.customer_name?.toLowerCase().includes(keyword) ||
      item.product_name?.toLowerCase().includes(keyword)
    )
  })

  // 📄 PAGINATION
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentData = filteredItems.slice(startIndex, startIndex + itemsPerPage)
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage)

  // 🔄 START DESIGN
  // Jika backend kamu mengupdate status per item detail, ubah URL API ini menuju `/order-items/${itemId}`
  const handleStartDesign = async (itemId: number, orderId: number) => {
    try {
      await apiFetch(`/orders/${orderId}`, {
        method: "PUT",
        body: JSON.stringify({
          stage: "desain",
          order_item_id: itemId // Menyisipkan info item yang dipilih desainer
        })
      })

      // Arahkan desainer langsung ke halaman kerja item tersebut
      router.push(`/desainer/order/${orderId}?item=${itemId}`)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <DesainerLayout>
      <div className="space-y-8">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Antrian Tugas (Per Produk)</h1>
        </div>

        {/* SEARCH */}
        <Input
          placeholder="Cari produk atau nomor pesanan..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setCurrentPage(1)
          }}
          className="max-w-sm"
        />

        {/* TABLE */}
        <Card className="w-full border-gray-200">
          <CardContent className="p-0">

            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead>No Pesanan</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  {/* 🛠️ Mengubah Header Dari "Produk" menjadi "Item yang Dikerjakan" */}
                  <TableHead>Item Produk</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Tahap</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {currentData.map((item) => {
                  const status = item.status_name.toLowerCase()

                  return (
                    <TableRow key={item.id} className="hover:bg-gray-50">
                      <TableCell className="text-blue-500 font-medium">
                        {item.order_code}
                      </TableCell>

                      <TableCell>{item.customer_name}</TableCell>
                      
                      {/* 🛠️ Menampilkan SATU nama produk secara mutlak, bukan join string koma lagi */}
                      <TableCell className="font-medium text-gray-900">
                        {item.product_name}
                      </TableCell>

                      <TableCell className="text-gray-500 text-sm">
                        {new Date(item.order_date).toLocaleString('en-US', {
                          timeZone: 'Asia/Jakarta',
                          month: '2-digit', day: '2-digit', year: '2-digit',
                          hour: '2-digit', minute: '2-digit', hour12: true
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
                        <Badge
                          variant="outline"
                          className={`rounded-md px-3 py-1 font-normal border ${
                            statusColor[status] || "text-gray-500 border-gray-200 bg-gray-50"
                          }`}
                        >
                          {item.status_name}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center justify-center gap-2">

                          {(status === "pending" || status === "revisi") && (
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700"
                              onClick={() => handleStartDesign(item.id, item.order_id)}
                            >
                              Kerjakan
                            </Button>
                          )}

                          {status === "diproses" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex items-center gap-1"
                              onClick={() => router.push(`/desainer/order/${item.order_id}?item=${item.id}`)}
                            >
                              <Eye size={14} />
                              Detail
                            </Button>
                          )}

                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 flex items-center gap-1"
                            onClick={() => router.push(`/desainer/chat/${item.order_id}?item=${item.id}`)}
                          >
                            <MessageCircle size={14} />
                            Chat
                          </Button>

                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>

            {/* PAGINATION */}
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <span className="text-sm text-gray-500">
                {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredItems.length)} of {filteredItems.length}
              </span>

              <Pagination className="mx-0 w-auto justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    />
                  </PaginationItem>

                  {Array.from({ length: totalPages }, (_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        href="#"
                        isActive={currentPage === i + 1}
                        onClick={() => setCurrentPage(i + 1)}
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>

          </CardContent>
        </Card>

      </div>
    </DesainerLayout>
  )
}