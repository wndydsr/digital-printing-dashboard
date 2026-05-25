// Ganti seluruh isi file app/operator/antrian-cetak/page.tsx

"use client"

import { useEffect, useState } from "react"
import {
  Eye,
  CheckCircle2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/api"

import { OperatorLayout } from "@/components/layout/OperatorLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

interface Order {
  id: number
  order_code: string
  order_date: string
  created_at: string
  customer?: {
    name: string
  }
  items?: {
    product?: {
      id: number
      name: string
    }
  }[]
  stage?: {
    id: number
    name: string
    status?: {
      id: number
      name: string
    }
  }
}

export default function AntrianCetakPage() {
  const router = useRouter()

  const [orders, setOrders] = useState<Order[]>([])
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  const itemsPerPage = 10

  // =========================
  // WARNA STATUS
  // =========================
  const statusColor: Record<string, string> = {
    pending: "bg-blue-100 text-blue-600 border-blue-200",
    diproses: "bg-yellow-100 text-yellow-600 border-yellow-200",
    revisi: "bg-red-100 text-red-600 border-red-200",
    selesai: "bg-green-100 text-green-600 border-green-200",
  }

  // =========================
  // WARNA TAHAP
  // =========================
  const stageColorByName: Record<string, string> = {
    "siap cetak": "text-yellow-500 border-yellow-200 bg-yellow-50/30",
    cetak: "text-blue-500 border-blue-200 bg-blue-50/30",
    selesai: "text-green-500 border-green-200 bg-green-50/30",
  }

  // =========================
  // LOAD DATA
  // =========================
  const fetchOrders = async () => {
    try {
      const data = await apiFetch("/orders")
      const result = Array.isArray(data) ? data : data.data || []

      // Hanya tampilkan data yang relevan untuk operator
      const filtered = result.filter((o: Order) => {
        const stage = o.stage?.name?.toLowerCase()
        return (
          stage === "siap cetak" ||
          stage === "cetak" ||
          stage === "selesai"
        )
      })

      // Urutkan terbaru
      const sorted = filtered.sort(
        (a: Order, b: Order) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      )

      setOrders(sorted)
    } catch (error) {
      console.error("Gagal memuat data pesanan:", error)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  // =========================
  // SEARCH
  // =========================
  const filteredOrders = orders.filter((order) => {
    const keyword = search.toLowerCase()

    return (
      order.order_code?.toLowerCase().includes(keyword) ||
      order.customer?.name?.toLowerCase().includes(keyword) ||
      order.items?.some((item) =>
        item.product?.name?.toLowerCase().includes(keyword)
      )
    )
  })

  // =========================
  // PAGINATION
  // =========================
  const totalPages = Math.ceil(
    filteredOrders.length / itemsPerPage
  )

  const startIndex = (currentPage - 1) * itemsPerPage

  const currentData = filteredOrders.slice(
    startIndex,
    startIndex + itemsPerPage
  )

  // =========================
  // UBAH STAGE MENJADI CETAK
  // =========================
  const handleStartPrint = async (id: number) => {
    router.push(`/operator/order/${id}`)
  }

  // =========================
  // UBAH STAGE MENJADI SELESAI
  // =========================
  const handleFinishPrint = async (id: number) => {
    try {
      await apiFetch(`/orders/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          stage: "selesai",
        }),
      })

      await fetchOrders()
    } catch (error) {
      console.error(error)
    }
  }


  return (
    <OperatorLayout>
      <div className="space-y-8">
        {/* ================= HEADER ================= */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Antrian Cetak
              </h1>
              <p className="text-gray-600 mt-1">
                Daftar pesanan yang siap dicetak dan sedang diproses
              </p>
            </div>
          </div>
        </div>

        {/* ================= SEARCH ================= */}
        <Input
          placeholder="Cari pesanan..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setCurrentPage(1)
          }}
          className="max-w-sm"
        />

        {/* ================= TABLE ================= */}
        <Card className="w-full border-gray-200">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">
                  Antrian Cetak
                </CardTitle>
                <CardDescription>
                  Daftar pesanan yang siap dicetak dan sedang diproses
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead>No Pesanan</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Tahap</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {currentData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-10 text-gray-500"
                    >
                      Tidak ada data pesanan
                    </TableCell>
                  </TableRow>
                ) : (
                  currentData.map((order) => {
                    const stageName =
                      order.stage?.name?.toLowerCase() || ""
                    const statusName =
                      order.stage?.status?.name?.toLowerCase() || ""

                    return (
                      <TableRow
                        key={order.id}
                        className="hover:bg-gray-50/80 transition-colors"
                      >
                        {/* No Pesanan */}
                        <TableCell className="text-blue-500 font-medium">
                          {order.order_code}
                        </TableCell>

                        {/* Pelanggan */}
                        <TableCell>
                          {order.customer?.name || "-"}
                        </TableCell>

                        {/* Produk */}
                        <TableCell>
                          {order.items
                            ?.map((item) => item.product?.name)
                            .filter(Boolean)
                            .join(", ") || "-"}
                        </TableCell>

                        {/* Deadline */}
                        <TableCell className="text-gray-500 text-sm">
                          {new Date(order.order_date).toLocaleString(
                            "id-ID"
                          )}
                        </TableCell>

                        {/* Tahap */}
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`rounded-md px-3 py-1 font-normal border ${
                              stageColorByName[stageName] ||
                              "text-gray-500 border-gray-200 bg-gray-50"
                            }`}
                          >
                            {order.stage?.name || "-"}
                          </Badge>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`rounded-md px-3 py-1 font-normal border ${
                              statusColor[statusName] ||
                              "bg-gray-100 text-gray-500 border-gray-200"
                            }`}
                          >
                            {order.stage?.status?.name || "-"}
                          </Badge>
                        </TableCell>

                        {/* Aksi */}
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            {/* Siap Cetak */}
                            {stageName === "siap cetak" && (
                              <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={() =>
                                  handleStartPrint(order.id)
                                }
                              >
                                Mulai Cetak
                              </Button>
                            )}

                            {/* Sedang Cetak */}
                            {stageName === "cetak" && (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() =>
                                  handleFinishPrint(order.id)
                                }
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Tandai Selesai
                              </Button>
                            )}

                            {/* Selesai */}
                            {stageName === "selesai" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  router.push(
                                    `/operator/order/${order.id}`
                                  )
                                }
                              >
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

            {/* ================= PAGINATION ================= */}
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <span className="text-sm text-gray-500">
                {filteredOrders.length === 0
                  ? "0 of 0"
                  : `${startIndex + 1} - ${Math.min(
                      startIndex + itemsPerPage,
                      filteredOrders.length
                    )} of ${filteredOrders.length}`}
              </span>

              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          setCurrentPage((prev) =>
                            Math.max(prev - 1, 1)
                          )
                        }}
                      />
                    </PaginationItem>

                    {Array.from(
                      { length: totalPages },
                      (_, i) => (
                        <PaginationItem key={i}>
                          <PaginationLink
                            href="#"
                            isActive={currentPage === i + 1}
                            onClick={(e) => {
                              e.preventDefault()
                              setCurrentPage(i + 1)
                            }}
                          >
                            {i + 1}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    )}

                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, totalPages)
                          )
                        }}
                      />
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