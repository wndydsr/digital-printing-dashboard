// Ganti seluruh isi file app/operator/page.tsx dengan kode berikut

"use client"

import { useEffect, useState } from "react"
import {
  Clock,
  CheckCircle,
  Workflow,
  Eye,
  CheckCircle2,
  ChevronDown,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/api"

import { OperatorLayout } from "@/components/layout/OperatorLayout"
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

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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

export default function DashboardOperator() {
  const router = useRouter()

  const [orders, setOrders] = useState<Order[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState("Last 30 days")

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
    "butuh desain": "text-red-500 border-red-200 bg-red-50/30",
    desain: "text-blue-500 border-blue-200 bg-blue-50/30",
    "siap cetak": "text-yellow-500 border-yellow-200 bg-yellow-50/30",
    cetak: "text-blue-500 border-blue-200 bg-blue-50/30",
    selesai: "text-green-500 border-green-200 bg-green-50/30",
  }

  // =========================
  // FILTER DATA UNTUK OPERATOR
  // Hanya menampilkan pesanan:
  // - siap cetak
  // - cetak
  // - selesai
  // =========================
  const filteredOrders = orders.filter((o) => {
    const stage = o.stage?.name?.toLowerCase()
    return stage === "siap cetak" || stage === "cetak" || stage === "selesai"
  })

  // =========================
  // URUTKAN TERBARU
  // =========================
  const latestOrders = [...filteredOrders]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    )
    .slice(0, 10)

  // =========================
  // METRIK DASHBOARD
  // =========================
  const antrianCetak = filteredOrders.filter(
    (o) => o.stage?.name?.toLowerCase() === "siap cetak"
  ).length

  const dikerjakan = filteredOrders.filter(
    (o) => o.stage?.name?.toLowerCase() === "cetak"
  ).length

  const selesai = filteredOrders.filter(
    (o) => o.stage?.name?.toLowerCase() === "selesai"
  ).length

  const metricsData = [
    {
      label: "Antrian Cetak",
      value: antrianCetak.toString(),
      icon: Clock,
    },
    {
      label: "Dikerjakan",
      value: dikerjakan.toString(),
      icon: Workflow,
    },
    {
      label: "Selesai",
      value: selesai.toString(),
      icon: CheckCircle,
    },
  ]

  // =========================
  // LOAD DATA
  // =========================
  useEffect(() => {
    const role = localStorage.getItem("role")

    if (!role) {
      window.location.href = "/login"
      return
    }

    if (role === "admin") {
      window.location.href = "/admin"
      return
    }

    if (role === "desainer") {
      window.location.href = "/desainer"
      return
    }

    const load = async () => {
      try {
        const data = await apiFetch("/orders")
        const result = Array.isArray(data) ? data : data.data || []
        setOrders(result)
      } catch (error) {
        console.error("Gagal memuat data pesanan:", error)
      }
    }

    load()
  }, [])

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

      const updated = await apiFetch("/orders")
      const result = Array.isArray(updated)
        ? updated
        : updated.data || []

      setOrders(result)
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
                Dashboard Operator
              </h1>
              <p className="text-gray-600 mt-1">
                Monitor antrian dan proses cetak
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-2 bg-transparent"
                >
                  {selectedPeriod}
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent>
                <DropdownMenuItem
                  onClick={() => setSelectedPeriod("Last 7 days")}
                >
                  Last 7 days
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSelectedPeriod("Last 30 days")}
                >
                  Last 30 days
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSelectedPeriod("Last 90 days")}
                >
                  Last 90 days
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ================= METRIC CARDS ================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {metricsData.map((metric, index) => (
            <Card
              key={index}
              className="hover:shadow-md transition-shadow border-gray-200"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <metric.icon className="w-5 h-5 text-gray-600" />
                  </div>
                </div>

                <div className="text-2xl font-semibold text-gray-900 mb-1">
                  {metric.value}
                </div>
                <div className="text-sm text-gray-600">
                  {metric.label}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ================= TABEL ANTRIAN CETAK ================= */}
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

              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                Lihat Semua
              </Button>
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
                  <TableHead className="text-center">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {latestOrders.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-10 text-gray-500"
                    >
                      Tidak ada data pesanan
                    </TableCell>
                  </TableRow>
                ) : (
                  latestOrders.map((order) => {
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
                          {new Date(
                            order.order_date
                          ).toLocaleString("id-ID")}
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
                            {/* Siap Cetak -> Tombol Mulai Cetak */}
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

                            {/* Cetak -> Tombol Tandai Selesai */}
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

                            {/* Selesai -> Detail */}
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
          </CardContent>
        </Card>
      </div>
    </OperatorLayout>
  )
}