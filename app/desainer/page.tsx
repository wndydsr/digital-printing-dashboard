"use client"

import { useState, useEffect } from "react"
import {
  Workflow,
  Clock,
  CheckCircle,
  ChevronDown,
  Eye,
  Trash2,
  MessageCircle,
} from "lucide-react"
import { AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import OrderDetailModal from "@/components/ui/order-detail"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/api"
import { DesainerLayout } from "@/components/layout/DesainerLayout"


interface Order {
  id: number;
  order_code: string;    // ORD-001
  customer?: { name: string }; // 'Windy Destiana'
  order_date: string;
  total_price: number;   // 50000
  current_stage_id: number
  product?: {
    id: number
    name: string
  }
  stage?: {
    id: number
    name: string
    status?: {
      id: number
    name: string
  }

}      // 'pending' atau 'completed'
  created_by: number;
  notes: string;         // 'Cetak banner'
  created_at: string;  
}


type ChartData = {
  name: string
  total: number
}


export default function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("Last 30 days")
  const [orders, setOrders] = useState<Order[]>([])
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [openDetail, setOpenDetail] = useState(false)
  const [timeRange, setTimeRange] = useState("30d")
  
  const statusColor: Record<string, string> = {
    baru: "bg-blue-100 text-blue-600",
    revisi: "bg-red-100 text-red-600",
    selesai: "bg-green-100 text-green-600",
  }
  const latestOrders = [...orders]
  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  .slice(0, 5)
  
  const menunggu = orders.filter(
    o => o.stage?.status?.name?.toLowerCase() === 'pending'
  ).length

  const diproses = orders.filter(
    o => o.stage?.status?.name?.toLowerCase() === 'diproses'
  ).length

  const selesai = orders.filter(
    o => o.stage?.status?.name?.toLowerCase() === 'selesai'
  ).length

  const stageColorByName: Record<string, string> = {
    "butuh desain": "text-red-500 border-red-200 bg-red-50/30",
    "siap cetak": "text-yellow-500 border-yellow-200 bg-yellow-50/30",
    "cetak": "text-blue-500 border-blue-200 bg-blue-50/30",
    "desain": "text-blue-500 border-blue-50 bg-blue-50/30",
    "selesai": "text-green-500 border-green-200 bg-green-50/30",
  }

  const [openDelete, setOpenDelete] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const handleDelete = async () => {
    if (!selectedId) return

    try {
     await apiFetch(`/orders/${selectedId}`, {
        method: "DELETE",
      })

      apiFetch("/orders")
       .then(setOrders)

      setOpenDelete(false)
      setSelectedId(null)
    } catch (err) {
      console.error(err)
    }
  }

  const router = useRouter()
  
  const handleStartDesign = async (id: number) => {
    try {
      await apiFetch(`/orders/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          stage: "desain"
        })
      })

      // reload data
      const updated = await apiFetch("/orders")
      setOrders(updated.data || updated)

    } catch (err) {
      console.error(err)
    }
  }

  const statusLabel = {
  1: "Menunggu",
  2: "Proses",
  3: "Selesai",
}

  const revisi = orders.filter(
    o => o.stage?.status?.name?.toLowerCase() === 'revisi'
  ).length

  const metricsData = [
  { label: "Antrian", value: menunggu.toString(), icon: Clock },
  { label: "Dikerjakan", value: diproses.toString(), icon: Workflow },
  { label: "Revisi", value: revisi.toString(), icon: Clock },
  { label: "Selesai", value: selesai.toString(), icon: CheckCircle },
]



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

  if (role === "operator") {
    window.location.href = "/operator"
    return
  }
  
  const load = async () => {
    try {
     const data = await apiFetch("/orders")

    const orders = Array.isArray(data) ? data : data.data || []

    // 🔥 filter hanya yang relevan buat desainer
    const filtered = orders.filter((o: Order) => {
      const stage = o.stage?.name?.toLowerCase()
      return stage === "butuh desain" || stage === "desain" || stage === "revisi"
    })

    setOrders(filtered)
    
    const status = (orders.stage?.status?.name || "").toLowerCase()

      const months = [
        "Jan","Feb","Mar","Apr","May","Jun",
        "Jul","Aug","Sep","Oct","Nov","Dec"
      ]

      const monthlyData = months.map((m, i) => ({
        name: m,
        total: orders.filter((o: Order) => {
          const date = new Date(o.order_date.replace(" ", "T"))
          return date.getMonth() === i
        }).length
      }))

      setChartData(monthlyData)
    } catch (err) {
      console.error(err)
    }
  }

  load()
}, [])

  return (
  
<DesainerLayout>
    <div className="space-y-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Dashboard Desainer</h1>
                <p className="text-gray-600 mt-1">Monitor your workflows and system performance</p>
              </div>
              <div className="flex items-center gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2 bg-transparent">
                      {selectedPeriod} <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setSelectedPeriod("Last 7 days")}>Last 7 days</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedPeriod("Last 30 days")}>Last 30 days</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedPeriod("Last 90 days")}>Last 90 days</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
    </div>

          <div className="grid grid-cols-4 gap-6 mb-8">
            {metricsData.map((metric, index) => (
              <Card key={index} className="bp-6 hover:shadow-md transition-shadow cursor-pointer border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <metric.icon className="w-5 h-5 text-gray-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-semibold text-gray-900 mb-1">{metric.value}</div>
                  <div className="text-sm text-gray-600">{metric.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-8">
            {/* Main Content Area */}
          </div>

           {/* Workflow Status Table */}
              <div className="mt-8"></div>
              <Card className="w-full border-gray-200">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold">Antrian Tugas</CardTitle>
                      <CardDescription>Monitor your workflow executions and performance</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        View All
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                    <TableRow className="bg-gray-50/50">
                      <TableHead className="font-medium text-gray-600">No Pesanan</TableHead>
                      <TableHead className="font-medium text-gray-600">Pelanggan</TableHead>
                      <TableHead className="font-medium text-gray-600">Produk</TableHead>
                      <TableHead className="font-medium text-gray-600">Deadline</TableHead>
                      <TableHead className="font-medium text-gray-600">Tanggal</TableHead>
                      <TableHead className="font-medium text-gray-600">Tahap</TableHead>
                      <TableHead className="font-medium text-gray-600">Status</TableHead>
                      <TableHead className="font-medium text-gray-600 text-center">Aksi</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                      {latestOrders.map((order) => (
                        <TableRow key={order.id} className="hover:bg-gray-50/80 transition-colors border-b border-gray-100">
                          {/* No Pesanan dengan warna biru khas link */}
                          <TableCell className="text-blue-500 font-medium">{order.order_code}</TableCell>
                          
                          {/* Pelanggan & Produk */}
                          <TableCell className="text-gray-700">{order.customer?.name}</TableCell> {/* Nanti bisa ambil dari order.customer.name */}
                          <TableCell className="text-gray-700">{order.product?.name || "-"}</TableCell>
                          
                          <TableCell>
                            {new Date(order.order_date).toLocaleString()}
                          </TableCell>

                          <TableCell className="text-gray-500 text-sm">
                            {new Date(order.order_date).toLocaleString('en-US', {
                              timeZone: 'Asia/Jakarta',
                              month: '2-digit', day: '2-digit', year: '2-digit',
                              hour: '2-digit', minute: '2-digit', hour12: true
                            })}
                          </TableCell>

                          {/* Tahap (Badge Outline Lembut) */}
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`rounded-md px-3 py-1 font-normal border ${
                                stageColorByName[order.stage?.name?.toLowerCase() || ""] ||
                                "text-gray-500 border-gray-200 bg-gray-50"
                              }`}
                            >
                              {order.stage?.name || "-"}
                            </Badge>
                          </TableCell>

                          {/* Status (Badge Solid Soft) */}
                         <TableCell>
                            <Badge
                              className={`rounded-md px-4 py-1 border-none font-medium shadow-none ${
                                statusColor[order.stage?.status?.name?.toLowerCase() || ""] ||
                                "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {order.stage?.status?.name || "-"}
                            </Badge>
                          </TableCell>

                          {/* Ikon Aksi (Eye & Trash) */}
                          <TableCell>
                          <div className="flex items-center justify-center gap-3">
                            {(() => {
                              const status = (order.stage?.status?.name || "").toLowerCase()

                              if (status === "pending" || status === "revisi") {
                                return (
                                  <button
                                    className="bg-blue-600 text-white px-3 py-1 rounded-lg"
                                    onClick={() => {
                                      handleStartDesign(order.id)
                                      router.push(`/desainer/order/${order.id}`)
                                    }}
                                  >
                                    Kerjakan
                                  </button>
                                )
                              }

                              return null
                            })()}

                            {/* 🔹 BUTTON CHAT */}
                            <button
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg flex items-center gap-1"
                              onClick={() => router.push(`/desainer/chat/${order.id}`)}
                            >
                              <MessageCircle size={14} />
                              Chat
                            </button>
                          </div>
                        </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <OrderDetailModal
              open={openDetail}
              onClose={() => setOpenDetail(false)}
              order={selectedOrder}
            />
    </DesainerLayout>
  )
}
