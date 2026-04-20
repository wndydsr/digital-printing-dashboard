"use client"

import { useState, useEffect } from "react"
import {
  Search,
  Bell,
  Home,
  Workflow,
  BarChart3,
  Settings,
  AlertTriangle,
  RefreshCw,
  MoreHorizontal,
  Filter,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  ChevronDown,
  Plus,
  ArrowRight,
  Users,
  Eye,
  Database,
} from "lucide-react"
import { AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import OrderDetailModal from "@/components/ui/order-detail"
import { PieChart, Pie, Cell, Legend } from "recharts"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"


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

  const statusLabel = {
  1: "Menunggu",
  2: "Proses",
  3: "Selesai",
}
  const statusColorMap: Record<number, string> = {
  1: "bg-yellow-100 text-yellow-600", // Pending
  2: "bg-blue-100 text-blue-600",     // Diproses
  3: "bg-green-100 text-green-600",   // Selesai
}

 const pieData = [
  { name: "Menunggu", value: menunggu },
  { name: "Diproses", value: diproses },
  { name: "Selesai", value: selesai },
]

  const metricsData = [
    { 
      label: "Total Pesanan", 
      value: orders.length.toString(), // Benar: Mengambil jumlah data asl 
      icon: Workflow 
    },
    { 
    label: "Pesanan Diproses", 
    value: diproses.toString(), 
    icon: Clock 
  },
  { 
    label: "Pesanan Menunggu", 
    value: menunggu.toString(),
    icon: Clock 
  },
  { 
    label: "Pesanan Selesai", 
    value: selesai.toString(), 
    icon: CheckCircle 
  },
  ]

useEffect(() => {
  fetch("http://127.0.0.1:8000/api/orders")
    .then((res) => res.json())
    .then((data: Order[]) => {
      console.log("DATA:", data)
        data.forEach(o => {
          console.log("STATUS:", o.stage?.status?.name)
        })
      setOrders(data)

      const months = [
        "Jan","Feb","Mar","Apr","May","Jun",
        "Jul","Aug","Sep","Oct","Nov","Dec"
      ]

      const monthlyData = months.map((monthName, index) => {
        const total = data.filter((order) => {
          const date = new Date(order.order_date.replace(" ", "T"))
          return date.getMonth() === index
        }).length

        return {
          name: monthName,
          total: total
        }
      })

       console.log("chartData:", monthlyData)

      setChartData(monthlyData)
    })
}, [])

  return (
 
  <DashboardLayout>
    <div className="space-y-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Dashboard Overview</h1>
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
            <div className="col-span-2 space-y-8">
              {/* Charts Section */}
              <Card className="border-gray-200">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold">Statistik Pesanan</CardTitle>
                      <CardDescription>Jumlah pesanan per bulan</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                 <div style={{ width: "100%", height: 300 }}>
                    <ResponsiveContainer>
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />

                        <Area
                          type="monotone"
                          dataKey="total"
                          stroke="#ef4444"
                          fill="#ef4444"
                          fillOpacity={0.2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>             
            </div>            
                      
            {/* Right Sidebar */}
            <div className="space-y-6"> 
              {/* Recent Activity */}
              <Card className="border-gray-200">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold">
                    Distribusi Pesanan
                  </CardTitle>
                </CardHeader>

        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>

                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  <Cell fill="#facc15" /> {/* Pending */}
                  <Cell fill="#1b93de" /> {/* Completed */}
                  <Cell fill="#44ef55" /> {/* Cancelled */}
                </Pie>

                <Tooltip />
                <Legend />

              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
            </div>
          </div>

           {/* Workflow Status Table */}
              <div className="mt-8"></div>
              <Card className="w-full border-gray-200">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold">Recent Workflow Runs</CardTitle>
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
                      <TableHead className="font-medium text-gray-600">Total</TableHead>
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
                          
                          {/* Harga & Tanggal */}
                          <TableCell className="font-medium text-gray-900">
                            Rp {Number(order.total_price).toLocaleString('id-ID')}
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
                            <Badge variant="outline" className={`
                              rounded-md px-3 py-1 font-normal border
                                rounded-md px-3 py-1 font-normal border
                                  ${
                                    stageColorByName[
                                      order.stage?.name?.toLowerCase() || ''
                                    ] || 'text-gray-500 border-gray-200 bg-gray-50'
                                  }
                                `}
                              >
                              {order.stage?.name || '-'}
                            </Badge>
                          </TableCell>

                          {/* Status (Badge Solid Soft) */}
                          <TableCell>
                            <Badge className={`
                              rounded-md px-4 py-1 border-none font-medium shadow-none
                              ${statusColorMap[order.stage?.status?.id || 0] || 'bg-gray-100 text-gray-500'}
                            `}>
                              {order.stage?.status?.name || '-'}
                            </Badge>
                          </TableCell>

                          {/* Ikon Aksi (Eye & Trash) */}
                          <TableCell>
                            <div className="flex items-center justify-center gap-3">
                              <button
                                onClick={() => {
                                  setSelectedOrder(order)
                                  setOpenDetail(true)
                                }}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                              <button className="text-gray-400 hover:text-red-500 transition-colors">
                                <XCircle className="w-5 h-5" />
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
    </DashboardLayout>
  )
}
