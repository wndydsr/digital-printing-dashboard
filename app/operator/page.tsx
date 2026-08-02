"use client"

import { useEffect, useState } from "react"
import { Clock, CheckCircle, Workflow, Eye, ChevronDown } from "lucide-react"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/api"
import { OperatorLayout } from "@/components/layout/OperatorLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface OperatorFlatDashboardItem {
  id: number
  item_id: number
  order_code: string
  customer_name: string
  product_name: string
  order_date: string
  created_at: string
  stage_name: string
  status_name: string
}

export default function DashboardOperator() {
  const router = useRouter()
  const [flatItems, setFlatItems] = useState<OperatorFlatDashboardItem[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState("Last 30 days")

  const statusColor: Record<string, string> = {
    pending: "bg-blue-100 text-blue-600 border-blue-200",
    diproses: "bg-yellow-100 text-yellow-600 border-yellow-200",
    revisi: "bg-red-100 text-red-600 border-red-200",
    selesai: "bg-green-100 text-green-600 border-green-200",
  }

  const stageColorByName: Record<string, string> = {
    "butuh desain": "text-red-500 border-red-200 bg-red-50/30",
    desain: "text-blue-500 border-blue-200 bg-blue-50/30",
    "siap cetak": "text-yellow-500 border-yellow-200 bg-yellow-50/30",
    cetak: "text-blue-500 border-blue-200 bg-blue-50/30",
    selesai: "text-green-500 border-green-200 bg-green-50/30",
  }

  useEffect(() => {
    const role = localStorage.getItem("role")
    if (!role) { window.location.href = "/login"; return; }
    if (role === "admin") { window.location.href = "/admin"; return; }
    if (role === "desainer") { window.location.href = "/desainer"; return; }

    const loadData = async () => {
          try {
            const data = await apiFetch("/orders")
            const result = Array.isArray(data) ? data : data.data || []

            // ─── FILTER BERDASARKAN PERIODE DROPDOWN ───
            const now = new Date()
            // 🔥 PERBAIKAN: Mengubah 'combinedResult' menjadi 'result'
            const filteredResult = result.filter((order: any) => {
              if (!order.order_date) return true
              
              const orderDateStr = order.order_date.includes(" ") 
                ? order.order_date.replace(" ", "T") 
                : order.order_date
                
              const orderDate = new Date(orderDateStr)
              
              if (isNaN(orderDate.getTime())) return true

              const diffTime = Math.abs(now.getTime() - orderDate.getTime())
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

              if (selectedPeriod === "Last 7 days") return diffDays <= 7
              if (selectedPeriod === "Last 90 days") return diffDays <= 90
              return diffDays <= 30
            })

            const rows: OperatorFlatDashboardItem[] = []
            filteredResult.forEach((order: any) => {
              order.items?.forEach((item: any) => {
                const itemStage = item.stage?.name || order.stage?.name || "Siap Cetak"
                const stageLower = itemStage.toLowerCase()

                if (stageLower === "siap cetak" || stageLower === "cetak" || stageLower === "selesai") {
                  rows.push({
                    id: order.id,
                    item_id: item.id,
                    order_code: order.order_code,
                    customer_name: order.customer?.name || "-",
                    product_name: item.product?.name || "-",
                    order_date: order.order_date,
                    created_at: order.created_at,
                    stage_name: itemStage,
                    status_name: item.stage?.status?.name || order.stage?.status?.name || "pending"
                  })
                }
              })
            })

            rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            setFlatItems(rows)
          } catch (error) {
            console.error("Gagal memuat data dashboard operator:", error)
          }
        }
    loadData()
  }, [selectedPeriod]) // 🔥 PERBAIKAN:selectedPeriod memicu penarikan data baru saat dropdown diklik

  const latestItems = flatItems
    .filter((item) => item.stage_name.toLowerCase() !== "selesai")
    .slice(0, 5)

  // MetrikBox Akurat Berbasis Jumlah Produk Item Nyata
  const antrianCetak = flatItems.filter((i) => i.stage_name.toLowerCase() === "siap cetak").length
  const dikerjakan = flatItems.filter((i) => i.stage_name.toLowerCase() === "cetak").length
  const selesai = flatItems.filter((i) => i.stage_name.toLowerCase() === "selesai").length

  const metricsData = [
    { label: "Antrian Cetak", value: antrianCetak.toString(), icon: Clock },
    { label: "Dikerjakan", value: dikerjakan.toString(), icon: Workflow },
    { label: "Selesai", value: selesai.toString(), icon: CheckCircle },
  ]

  const handleStartPrint = (orderId: number, itemId: number) => {
    router.push(`/operator/order/${orderId}?item=${itemId}`)
  }

  const handleFinishPrint = async (itemId: number) => {
    try {
      await apiFetch(`/orders/items/${itemId}/stage`, {
        method: "PUT",
        body: JSON.stringify({ current_stage_id: 5 }),
      })
      window.location.reload()
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <OperatorLayout>
      <div className="space-y-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Dashboard Operator</h1>
              <p className="text-gray-600 mt-1">Monitor antrian produksi kerja per produk cetak</p>
            </div>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {metricsData.map((metric, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow border-gray-200">
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

        <Card className="w-full border-gray-200">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">Antrian Cetak Aktif</CardTitle>
                <CardDescription>/orders ringkasan tugas cetak yang masuk</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => router.push("/operator/antrian")}>
                <Eye className="w-4 h-4 mr-2" /> Lihat Semua
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead>No Pesanan</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Item Produk</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Tahap Item</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latestItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-gray-500">Tidak ada data pesanan</TableCell>
                  </TableRow>
                ) : (
                  latestItems.map((item, idx) => (
                    <TableRow key={`${item.item_id}-${idx}`} className="hover:bg-gray-50/80 transition-colors">
                      <TableCell className="text-blue-500 font-medium">{item.order_code}</TableCell>
                      <TableCell>{item.customer_name}</TableCell>
                      <TableCell className="font-semibold text-gray-900">{item.product_name}</TableCell>
                      <TableCell className="text-gray-500 text-sm">{new Date(item.order_date).toLocaleString("id-ID")}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`rounded-md px-3 py-1 font-normal border ${stageColorByName[item.stage_name.toLowerCase()] || "text-gray-500 border-gray-200 bg-gray-50"}`}>
                          {item.stage_name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`rounded-md px-3 py-1 font-normal border ${statusColor[item.status_name.toLowerCase()] || "bg-gray-100 text-gray-500 border-gray-200"}`}>
                          {item.status_name}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          {item.stage_name.toLowerCase() === "siap cetak" && (
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => handleStartPrint(item.id, item.item_id)}>
                              Mulai Cetak
                            </Button>
                          )}
                          
                          {item.stage_name.toLowerCase() === "cetak" && (
                            <>
                              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleFinishPrint(item.item_id)}>
                                Tandai Selesai
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => router.push(`/operator/order/${item.id}?item=${item.item_id}`)}>
                                Detail
                              </Button>
                            </>
                          )}
                          
                          {item.stage_name.toLowerCase() === "selesai" && (
                            <Button size="sm" variant="outline" onClick={() => router.push(`/operator/order/${item.id}?item=${item.item_id}`)}>
                              Detail
                            </Button>
                          )}
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
    </OperatorLayout>
  )
}