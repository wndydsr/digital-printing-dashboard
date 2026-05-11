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

  interface Order {
    id: number
    order_code: string
    customer?: { name: string }
    order_date: string
    product?: { name: string }
    stage?: {
      name: string
      status?: {
        name: string
      }
    }
  }

  export default function AntrianPage() {
    const [orders, setOrders] = useState<Order[]>([])
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
        const data = await apiFetch("/orders")
        const result = Array.isArray(data) ? data : data.data || []

        const filtered = result.filter((o: Order) => {
          const stage = o.stage?.name?.toLowerCase()
          return stage === "butuh desain" || stage === "desain" || stage === "revisi"
        })

        setOrders(filtered)
      } catch (err) {
        console.error(err)
      }
    }

    useEffect(() => {
      fetchOrders()
    }, [])

    // 🔍 SEARCH
    const filteredOrders = orders.filter((order) => {
      const keyword = search.toLowerCase()
      return (
        order.order_code?.toLowerCase().includes(keyword) ||
        order.customer?.name?.toLowerCase().includes(keyword) ||
        order.product?.name?.toLowerCase().includes(keyword)
      )
    })

    // 📄 PAGINATION
    const startIndex = (currentPage - 1) * itemsPerPage
    const currentData = filteredOrders.slice(startIndex, startIndex + itemsPerPage)
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)

    // 🔄 START DESIGN
    const handleStartDesign = async (id: number) => {
      try {
        await apiFetch(`/orders/${id}`, {
          method: "PUT",
          body: JSON.stringify({
            stage: "desain"
          })
        })

        router.push(`/desainer/order/${id}`)
      } catch (err) {
        console.error(err)
      }
    }

    return (
      <DesainerLayout>
        <div className="space-y-8">

          {/* HEADER */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Antrian Tugas</h1>
          </div>

          {/* SEARCH */}
          <Input
            placeholder="Cari pesanan..."
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
                    <TableHead>Produk</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Tahap</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {currentData.map((order) => {
                    const status = order.stage?.status?.name?.toLowerCase() || ""

                    return (
                      <TableRow key={order.id} className="hover:bg-gray-50">
                        <TableCell className="text-blue-500 font-medium">
                          {order.order_code}
                        </TableCell>

                        <TableCell>{order.customer?.name}</TableCell>
                        <TableCell>{order.product?.name || "-"}</TableCell>

                        <TableCell>
                          {new Date(order.order_date).toLocaleString()}
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`rounded-md px-3 py-1 font-normal border ${
                              stageColorByName[
                                order.stage?.name?.toLowerCase() || ""
                              ] || "text-gray-500 border-gray-200 bg-gray-50"
                            }`}
                          >
                            {order.stage?.name || "-"}
                          </Badge>
                        </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`rounded-md px-3 py-1 font-normal border ${
                            statusColor[status] || "text-gray-500 border-gray-200 bg-gray-50"
                          }`}
                        >
                          {order.stage?.status?.name || "-"}
                        </Badge>
                      </TableCell>

                        <TableCell>
                          <div className="flex items-center justify-center gap-2">

                            {(status === "pending" || status === "revisi") && (
                              <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={() => handleStartDesign(order.id)}
                              >
                                Kerjakan
                              </Button>
                            )}

                            {status === "diproses" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex items-center gap-1"
                                onClick={() => router.push(`/desainer/order/${order.id}`)}
                              >
                                <Eye size={14} />
                                Detail
                              </Button>
                            )}

                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 flex items-center gap-1"
                              onClick={() => router.push(`/desainer/chat/${order.id}`)}
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
                  {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredOrders.length)} of {filteredOrders.length}
                </span>

                <Pagination>
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