"use client"

import { useState, useEffect } from "react"
import {
  Workflow,
  Clock,
  CheckCircle,
  ChevronDown,
  Eye,
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
import Link from "next/link"

interface FlatOrderItem {
  id: number         
  order_id: number   
  order_code: string
  customer_name: string
  order_date: string
  product_name: string
  stage_name: string
  status_name: string
  raw_order_payload: any
}

type ChartData = {
  name: string
  total: number
}

export default function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("Last 30 days")
  const [flatItems, setFlatItems] = useState<FlatOrderItem[]>([]) 
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [openDetail, setOpenDetail] = useState(false)
  
  // State counter metrik per item produk (Tanpa Revisi)
  const [countAntrian, setCountAntrian] = useState(0)
  const [countDikerjakan, setCountDikerjakan] = useState(0)
  const [countSelesai, setCountSelesai] = useState(0)

  const router = useRouter()

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-600",
    diproses: "bg-blue-100 text-blue-600",
    revisi: "bg-red-100 text-red-600",
    selesai: "bg-green-100 text-green-600",
  }

  const stageColorByName: Record<string, string> = {
    "butuh desain": "text-red-500 border-red-200 bg-red-50/30",
    "antrean desain": "text-orange-500 border-orange-200 bg-orange-50/30",
    "siap cetak": "text-yellow-500 border-yellow-200 bg-yellow-50/30",
    "cetak": "text-blue-500 border-blue-200 bg-blue-50/30",
    "desain": "text-blue-500 border-blue-50 bg-blue-50/30",
    "selesai": "text-green-500 border-green-200 bg-green-50/30",
  }

  // Mengambil maksimal 5 item produk yang butuh penanganan desainer (termasuk yang revisi tetap masuk antrian tabel)
  const latestFlatItems = flatItems
    .filter(item => ["butuh desain", "desain", "revisi"].includes(item.stage_name.toLowerCase()))
    .sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())
    .slice(0, 5)

  // Metrik data dikurangi menjadi 3 item
  const metricsData = [
    { label: "Antrian", value: countAntrian.toString(), icon: Clock },
    { label: "Dikerjakan", value: countDikerjakan.toString(), icon: Workflow },
    { label: "Selesai (Approved)", value: countSelesai.toString(), icon: CheckCircle },
  ]

  const loadData = async () => {
    try {
      const data = await apiFetch("/designer/orders")
      const result = Array.isArray(data) ? data : data.data || []

      const flattenedList: FlatOrderItem[] = []
      
      let antrianItem = 0
      let dikerjakanItem = 0
      let selesaiApprovedItem = 0

      result.forEach((order: any) => {
        const orderStage = order.stage?.name || "Butuh Desain"
        const orderStatus = order.stage?.status?.name || "pending"
        
        const hasDesigner = order.designer_id || order.designer || order.items?.some((i: any) => i.designer_id || i.designer)

        if (order.items && order.items.length > 0) {
          order.items.forEach((item: any) => {
            const itemStage = item.stage?.name || orderStage
            const itemStatus = item.stage?.status?.name || orderStatus
            const stageLower = itemStage.toLowerCase()

            // Filter counter metrik per item produk
            if (stageLower === "butuh desain") {
              antrianItem++
            } else if (stageLower === "desain" || stageLower === "revisi") {
              // Item berstatus revisi diakumulasikan ke metrik Dikerjakan agar desainer fokus menyelesaikannya
              dikerjakanItem++
            } else if (["siap cetak", "cetak", "selesai"].includes(stageLower) && hasDesigner) {
              selesaiApprovedItem++
            }

            flattenedList.push({
              id: item.id,
              order_id: order.id,
              order_code: order.order_code,
              customer_name: order.customer?.name || "-",
              order_date: order.order_date,
              product_name: item.product?.name || "Produk Tanpa Nama",
              stage_name: itemStage,
              status_name: itemStatus,
              raw_order_payload: order
            })
          })
        }
      })

      setCountAntrian(antrianItem)
      setCountDikerjakan(dikerjakanItem)
      setCountSelesai(selesaiApprovedItem)
      setFlatItems(flattenedList)

      // Grafik bulanan
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
      const monthlyData = months.map((m, i) => ({
        name: m,
        total: result.filter((o: any) => {
          const date = new Date(o.order_date.replace(" ", "T"))
          return date.getMonth() === i
        }).length
      }))
      setChartData(monthlyData)

    } catch (err) {
      console.error(err)
    }
  }

  const handleStartDesign = async (itemId: number, orderId: number) => {
    try {
      await apiFetch(`/orders/${orderId}`, {
        method: "PUT",
        body: JSON.stringify({
          stage: "desain",
          order_item_id: itemId
        })
      })
      
      await loadData()
      router.push(`/desainer/order/${orderId}?item=${itemId}`)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    const role = localStorage.getItem("role")
    if (!role) {
      window.location.href = "/login"
      return
    }
    if (role === "admin") { window.location.href = "/admin"; return; }
    if (role === "operator") { window.location.href = "/operator"; return; }
    
    loadData()
  }, [])

  return (
    <DesainerLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Dashboard Desainer</h1>
              <p className="text-gray-600 mt-1">Monitor your production items workflow performance</p>
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

        {/* Metrik Tugas Diubah grid-cols-3 */}
        <div className="grid grid-cols-3 gap-6 mb-8">
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

        {/* Tabel Antrian Tugas Per Item Produk */}
        <div className="mt-8">
          <Card className="w-full border-gray-200">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">Antrian Tugas (Per Produk)</CardTitle>
                  <CardDescription>Monitor current assignments per product items</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Link href="/desainer/antrian"> 
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
                    <TableHead className="font-medium text-gray-600">Tanggal</TableHead>
                    <TableHead className="font-medium text-gray-600">Tahap</TableHead>
                    <TableHead className="font-medium text-gray-600">Status</TableHead>
                    <TableHead className="font-medium text-gray-600 text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {latestFlatItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-gray-500 text-sm">
                        Tidak ada antrian aktif saat ini.
                      </TableCell>
                    </TableRow>
                  ) : (
                    latestFlatItems.map((item, idx) => {
                      const status = item.status_name.toLowerCase()

                      return (
                        <TableRow key={`${item.id}-${idx}`} className="hover:bg-gray-50/80 transition-colors border-b border-gray-100">
                          <TableCell className="text-blue-500 font-medium">{item.order_code}</TableCell>
                          <TableCell className="text-gray-700">{item.customer_name}</TableCell>
                          <TableCell className="font-medium text-gray-900">{item.product_name}</TableCell>
                          
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
                                statusColor[status] || "bg-gray-100 text-gray-500"
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
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      <OrderDetailModal
        open={openDetail}
        onClose={() => setOpenDetail(false)}
        order={selectedOrder}
      />
    </DesainerLayout>
  )
}