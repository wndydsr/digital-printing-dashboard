"use client"

import { useState, useEffect } from "react"
import {
  Workflow,
  Clock,
  CheckCircle,
  ChevronDown,
  Eye,
  Trash2,
} from "lucide-react"
import { AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import OrderDetailModal from "@/components/ui/order-detail"
import { PieChart, Pie, Cell, Legend } from "recharts"
import DeleteModal from "@/components/ui/DeleteModal"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DashboardLayout } from "@/components/dashboard-layout"
import { apiFetch } from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link" // Pastikan mengimport Link jika menggunakan Next.js router

interface Order {
  id: number;
  order_code: string;
  customer?: { name: string };
  order_date: string;
  total_price: number;
  current_stage_id: number;
  designer_id?: number;
  designer?: {
    id: number;
    name: string;
  };
  items?: {
    id: number
    quantity: number
    subtotal: number
    product?: {
      id: number
      name: string
    }
    stage?: {
      name: string
    }
  }[];
  stage?: {
    id: number;
    name: string;
    status?: {
      id: number;
      name: string;
    };
  };
  created_by: number;
  notes: string;
  created_at: string;  
}

// Interface Flat Item yang disesuaikan dengan AnalyticsPage
interface FlatOrderItem {
  id: number;
  item_id: number;
  order_code: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  subtotal: number;
  created_at: string;
  designer: { id: number; name: string } | null;
  stage_name: string;
  raw_order_payload: any;
}

type ChartData = {
  name: string
  total: number
}

export default function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("Last 30 days")
  const [orders, setOrders] = useState<Order[]>([])
  const [flatItems, setFlatItems] = useState<FlatOrderItem[]>([]) // State baru untuk data flat per item
  const [designers, setDesigners] = useState<any[]>([]) 
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [openDetail, setOpenDetail] = useState(false)
  const { toast } = useToast()

  // Ambil hanya 5 item flat terbaru untuk ditampilkan di tabel dashboard
  const latestFlatItems = [...flatItems]
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
    "antrean desain": "text-orange-500 border-orange-200 bg-orange-50/30",
    "siap cetak": "text-yellow-500 border-yellow-200 bg-yellow-50/30",
    "cetak": "text-blue-500 border-blue-200 bg-blue-50/30",
    "desain": "text-blue-500 border-blue-50 bg-blue-50/30",
    "selesai": "text-green-500 border-green-200 bg-green-50/30",
  }

  const [openDelete, setOpenDelete] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)

const loadData = async () => {
    try {
      const orderData = await apiFetch("/orders")
      const parsedOrders = Array.isArray(orderData) ? orderData : orderData.data || []
      
      // ─── FILTER BERDASARKAN PERIODE DROPDOWN ───
      const now = new Date()
      const filteredOrders = parsedOrders.filter((o: Order) => {
        // Penanganan parsing tanggal yang lebih aman & fleksibel
        const orderDateStr = o.order_date ? o.order_date.replace(" ", "T") : o.created_at
        const orderDate = new Date(orderDateStr)
        
        // Cek jika tanggal tidak valid
        if (isNaN(orderDate.getTime())) return false

        const diffTime = Math.abs(now.getTime() - orderDate.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (selectedPeriod === "Last 7 days") return diffDays <= 7
        if (selectedPeriod === "Last 90 days") return diffDays <= 90
        return diffDays <= 30 // Default Last 30 days
      })

      setOrders(filteredOrders)

      // ─── LOGIKA SINKRONISASI FLAT ITEM ───
      const rows: FlatOrderItem[] = []
      filteredOrders.forEach((order: any) => {
        // 🌟 Filter out order yang masih Menunggu Pembayaran (Stage 7) atau Dibatalkan (Stage 8)
        if (order.current_stage_id === 7 || order.current_stage_id === 8) {
          return; // Skip/Abaikan transaksi yang belum lunas atau batal
        }

        if (order && Array.isArray(order.items)) {
          order.items.forEach((item: any) => {
            // 🌟 Filter item jika level item juga masih di Stage 7 atau 8
            if (item.order_stage_id === 7 || item.order_stage_id === 8) {
              return;
            }

            rows.push({
              id: order.id,
              item_id: item.id,
              order_code: order.order_code || "-",
              customer_name: order.customer?.name || "-",
              product_name: item.product?.name || "-",
              quantity: item.quantity || 1,
              subtotal: item.subtotal || (Number(item.price || 0) * Number(item.quantity || 1)),
              stage_name: item.stage?.name || order.stage?.name || "Antrean Desain",
              created_at: order.created_at || new Date().toISOString(),
              designer: order.designer || null,
              raw_order_payload: order
            })
          })
        }
      })
      setFlatItems(rows)

      // Fetch list desainer
      const designerData = await apiFetch("/users")
      setDesigners(Array.isArray(designerData) ? designerData : designerData.data || [])

      // ─── PERBAIKAN GRAFIK BULANAN ───
      const months = [
        "Jan","Feb","Mar","Apr","May","Jun",
        "Jul","Aug","Sep","Oct","Nov","Dec"
      ]
      const monthlyData = months.map((m, i) => ({
        name: m,
        total: filteredOrders.filter((o: Order) => {
          const orderDateStr = o.order_date ? o.order_date.replace(" ", "T") : o.created_at
          const date = new Date(orderDateStr)
          return !isNaN(date.getTime()) && date.getMonth() === i
        }).length
      }))
      setChartData(monthlyData)
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async () => {
    if (!selectedId) return
    try {
      await apiFetch(`/orders/${selectedId}`, { method: "DELETE" })
      loadData()
      setOpenDelete(false)
      setSelectedId(null)
    } catch (err) {
      console.error(err)
    }
  }

  const handleAssignDesigner = async (orderId: number, designerId: string) => {
    try {
      await apiFetch(`/orders/${orderId}/assign-designer`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ designer_id: Number(designerId) })
      })

      toast({
        title: "Berhasil",
        description: "Desainer berhasil diperbarui.",
      })
      loadData()
    } catch (err) {
      console.error(err)
      toast({
        title: "Gagal",
        description: "Terjadi kesalahan saat menugaskan desainer.",
        variant: "destructive"
      })
    }
  }

  const pieData = [
    { name: "Menunggu", value: menunggu },
    { name: "Diproses", value: diproses },
    { name: "Selesai", value: selesai },
  ]

  const metricsData = [
    { label: "Total Pesanan", value: orders.length.toString(), icon: Workflow },
    { label: "Pesanan Diproses", value: diproses.toString(), icon: Clock },
    { label: "Pesanan Menunggu", value: menunggu.toString(), icon: Clock },
    { label: "Pesanan Selesai", value: selesai.toString(), icon: CheckCircle },
  ]

  useEffect(() => {
      const role = localStorage.getItem("role");
      if (role !== "admin") {
        window.location.href = "/login";
      }
      loadData()
    }, [selectedPeriod]) // 🔥 PERBAIKAN: Menambahkan selectedPeriod agar loadData dipanggil otomatis saat filter berubah

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

        {/* Metrics Grid */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          {metricsData.map((metric, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer border-gray-200">
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
          {/* Charts Section */}
          <div className="col-span-2 space-y-8">
            <Card className="border-gray-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Statistik Pesanan</CardTitle>
                <CardDescription>Jumlah pesanan per bulan</CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer>
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="total" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>              
          </div>            
          
          {/* Pie Chart Distribution */}
          <div className="space-y-6"> 
            <Card className="border-gray-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Distribusi Pesanan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        <Cell fill="#facc15" />
                        <Cell fill="#1b93de" />
                        <Cell fill="#44ef55" />
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

        {/* Recent Workflow Runs (Flat Items & 5 Terbaru) */}
        <div className="mt-8">
          <Card className="w-full border-gray-200">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">Recent Workflow Runs</CardTitle>
                  <CardDescription>Monitor your production items workflow performance</CardDescription>
                </div>
                <div>
                  {/* Diarahkan langsung ke page pesanan / analytics */}
                  <Link href="/admin/pesanan">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      View All
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="font-medium text-gray-600">No Pesanan</TableHead>
                    <TableHead className="font-medium text-gray-600">Pelanggan</TableHead>
                    <TableHead className="font-medium text-gray-600">Item Produk</TableHead>
                    <TableHead className="font-medium text-gray-600">Qty</TableHead>
                    <TableHead className="font-medium text-gray-600">Subtotal</TableHead>
                    <TableHead className="font-medium text-gray-600">Tanggal</TableHead>
                    <TableHead className="font-medium text-gray-600">Desainer</TableHead>
                    <TableHead className="font-medium text-gray-600">Tahap Item</TableHead>
                    <TableHead className="font-medium text-gray-600 text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {latestFlatItems.map((item, idx) => (
                    <TableRow key={`${item.id}-${item.item_id}-${idx}`} className="hover:bg-gray-50/80 transition-colors border-b border-gray-100">
                      <TableCell className="text-blue-500 font-medium">{item.order_code}</TableCell>
                      <TableCell className="text-gray-700">{item.customer_name}</TableCell>
                      <TableCell className="font-semibold text-gray-900">{item.product_name}</TableCell>
                      <TableCell className="text-gray-600">{item.quantity}x</TableCell>
                      <TableCell className="font-medium text-gray-900">
                        Rp {Number(item.subtotal).toLocaleString('id-ID')}
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {new Date(item.created_at).toLocaleString('id-ID', {
                          month: '2-digit', day: '2-digit', year: '2-digit',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </TableCell>

                      {/* Alokasi Tugas Desainer (Dropdown Berbasis Shacdn UI Select dari AnalyticsPage) */}
                      <TableCell className="min-w-[160px]">
                        {item.stage_name.toLowerCase() === "menunggu pembayaran" ? (
                          <Badge variant="outline" className="rounded-md px-2.5 py-1 font-normal text-amber-600 border-amber-200 bg-amber-50">
                            Menunggu Pembayaran
                          </Badge>
                        ) : ["siap cetak", "cetak", "selesai"].includes(item.stage_name.toLowerCase()) ? (
                          <Badge variant="outline" className="rounded-md px-2.5 py-1 font-normal text-gray-400 border-gray-200 bg-gray-50/50">
                            File Siap Cetak (Langsung)
                          </Badge>
                        ) : (
                          <Select
                            value={item.designer?.id?.toString() || "unassigned"}
                            onValueChange={(val) => handleAssignDesigner(item.id, val)}
                          >
                            <SelectTrigger className={`h-8 w-full border text-xs font-medium ${!item.designer ? 'text-amber-600 border-amber-200 bg-amber-50/40 font-semibold' : 'text-gray-700'}`}>
                              <SelectValue placeholder="Pilih Desainer" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned" disabled>Belum Ditugaskan</SelectItem>
                              {designers.map((designer) => (
                                <SelectItem key={designer.id} value={designer.id.toString()}>{designer.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>

                      {/* Badge Tahap Item Mandiri */}
                      <TableCell>
                        <Badge variant="outline" className={`rounded-md px-3 py-1 font-normal border ${stageColorByName[item.stage_name.toLowerCase()] || 'text-gray-500 border-gray-200 bg-gray-50'}`}>
                          {item.stage_name}
                        </Badge>
                      </TableCell>

                      {/* Aksi */}
                      <TableCell>
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={() => {
                              setSelectedOrder(item.raw_order_payload)
                              setOpenDetail(true)
                            }}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedId(item.id)
                              setOpenDelete(true)
                            }}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <OrderDetailModal open={openDetail} onClose={() => setOpenDetail(false)} order={selectedOrder} />
      <DeleteModal open={openDelete} onClose={() => setOpenDelete(false)} onDelete={handleDelete} />
    </DashboardLayout>
  )
}