"use client"

import { useEffect, useState } from "react"
import { Eye, CheckCircle2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/api"
import { OperatorLayout } from "@/components/layout/OperatorLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"

interface OperatorFlatItem {
  id: number             // ID Order Utama
  item_id: number        // ID Order Item
  order_code: string
  customer_name: string
  product_name: string
  quantity: number
  order_date: string
  created_at: string
  stage_name: string
  status_name: string
}

export default function AntrianCetakPage() {
  const router = useRouter()
  const [flatItems, setFlatItems] = useState<OperatorFlatItem[]>([])
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  const itemsPerPage = 10

  const statusColor: Record<string, string> = {
    pending: "bg-blue-100 text-blue-600 border-blue-200",
    diproses: "bg-yellow-100 text-yellow-600 border-yellow-200",
    revisi: "bg-red-100 text-red-600 border-red-200",
    selesai: "bg-green-100 text-green-600 border-green-200",
  }

  const stageColorByName: Record<string, string> = {
    "siap cetak": "text-yellow-500 border-yellow-200 bg-yellow-50/30",
    cetak: "text-blue-500 border-blue-200 bg-blue-50/30",
    selesai: "text-green-500 border-green-200 bg-green-50/30",
  }

  const fetchOrders = async () => {
    try {
      const data = await apiFetch("/orders")
      const result = Array.isArray(data) ? data : data.data || []

      const rows: OperatorFlatItem[] = []
      result.forEach((order: any) => {
        order.items?.forEach((item: any) => {
          const itemStage = item.stage?.name || order.stage?.name || "Siap Cetak"
          const stageLower = itemStage.toLowerCase()

          // Filter: Hanya masukkan item yang sudah siap cetak, sedang dicetak, atau selesai
          if (stageLower === "siap cetak" || stageLower === "cetak" || stageLower === "selesai") {
            rows.push({
              id: order.id,
              item_id: item.id,
              order_code: order.order_code,
              customer_name: order.customer?.name || "-",
              product_name: item.product?.name || "-",
              quantity: item.quantity || 1,
              order_date: order.order_date,
              created_at: order.created_at,
              stage_name: itemStage,
              status_name: item.stage?.status?.name || order.stage?.status?.name || "pending"
            })
          }
        })
      })

      // Urutkan berdasarkan tanggal terbaru
      rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setFlatItems(rows)
    } catch (error) {
      console.error("Gagal memuat data pesanan:", error)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const filteredItems = flatItems.filter((item) => {
    const keyword = search.toLowerCase()
    return (
      item.order_code?.toLowerCase().includes(keyword) ||
      item.customer_name?.toLowerCase().includes(keyword) ||
      item.product_name?.toLowerCase().includes(keyword)
    )
  })

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage || 1)
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentData = filteredItems.slice(startIndex, startIndex + itemsPerPage)

  const handleStartPrint = async (orderId: number, itemId: number) => {
    // Alihkan langsung dengan menyematkan query item yang ditargetkan
    router.push(`/operator/order/${orderId}?item=${itemId}`)
  }

  const handleFinishPrint = async (itemId: number) => {
    try {
      // Menembak endpoint updateStage khusus item level cetak melalui API updateStage percetakan
      await apiFetch(`/orders/items/${itemId}/stage`, {
        method: "PUT",
        body: JSON.stringify({ current_stage_id: 5 }), // 5 = Selesai
      })
      await fetchOrders()
    } catch (error) {
      console.error("Gagal menyelesaikan cetak item:", error)
    }
  }

  return (
    <OperatorLayout>
      <div className="space-y-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Antrian Cetak (Per Produk)</h1>
              <p className="text-gray-600 mt-1">Daftar item produk yang siap dicetak dan sedang diproses</p>
            </div>
          </div>
        </div>

        <Input
          placeholder="Cari No. Pesanan, pelanggan atau produk..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setCurrentPage(1)
          }}
          className="max-w-sm"
        />

        <Card className="w-full border-gray-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Antrian Kerja Percetakan</CardTitle>
            <CardDescription>Daftar penugasan produksi cetak mandiri per jenis produk cetak</CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead>No Pesanan</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Item Produk</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Tahap Item</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {currentData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-gray-500">
                      Tidak ada antrian produksi cetak saat ini
                    </TableCell>
                  </TableRow>
                ) : (
                  currentData.map((item, idx) => {
                    const stageLower = item.stage_name.toLowerCase()
                    const statusLower = item.status_name.toLowerCase()

                    return (
                      <TableRow key={`${item.item_id}-${idx}`} className="hover:bg-gray-50/80 transition-colors">
                        <TableCell className="text-blue-500 font-medium">{item.order_code}</TableCell>
                        <TableCell>{item.customer_name}</TableCell>
                        <TableCell className="font-semibold text-gray-900">{item.product_name}</TableCell>
                        <TableCell className="text-gray-600">{item.quantity}x</TableCell>
                        <TableCell className="text-gray-500 text-sm">
                          {new Date(item.order_date).toLocaleString("id-ID")}
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" className={`rounded-md px-3 py-1 font-normal border ${stageColorByName[stageLower] || "text-gray-500 border-gray-200 bg-gray-50"}`}>
                            {item.stage_name}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" className={`rounded-md px-3 py-1 font-normal border ${statusColor[statusLower] || "bg-gray-100 text-gray-500 border-gray-200"}`}>
                            {item.status_name}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            {stageLower === "siap cetak" && (
                              <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => handleStartPrint(item.id, item.item_id)}>
                                Mulai Cetak
                              </Button>
                            )}

                            {stageLower === "cetak" && (
                              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleFinishPrint(item.item_id)}>
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Selesai Cetak
                              </Button>
                            )}

                            {stageLower === "selesai" && (
                              <Button size="sm" variant="outline" onClick={() => router.push(`/operator/order/${item.id}?item=${item.item_id}`)}>
                                <Eye className="w-4 h-4 mr-1" />
                                Detail
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <span className="text-sm text-gray-500">
                {filteredItems.length === 0
                  ? "0 of 0"
                  : `${startIndex + 1} - ${Math.min(startIndex + itemsPerPage, filteredItems.length)} of {filteredItems.length} items`}
              </span>

              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage((prev) => Math.max(prev - 1, 1)); }} />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => (
                      <PaginationItem key={i}>
                        <PaginationLink href="#" isActive={currentPage === i + 1} onClick={(e) => { e.preventDefault(); setCurrentPage(i + 1); }}>
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setCurrentPage((prev) => Math.min(prev + 1, totalPages)); }} />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </OperatorLayout>
  )
}