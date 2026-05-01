"use client"

import { useEffect, useState, } from "react"
import { TrendingUp, TrendingDown, BarChart3, Activity, Clock, CheckCircle, XCircle, Download } from "lucide-react"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Pie,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"
import { DashboardLayout } from "@/components/dashboard-layout"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"


export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("30d")
  const [revenueData, setRevenueData] = useState<any[]>([])
  const [orderData, setOrderData] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])

  const latestOrders = transactions
    .filter((item) => item.status?.toLowerCase() === "selesai")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  const [kpi, setKpi] = useState<any>({
    total_pendapatan: 0,
    total_pesanan: 0,
    pesanan_selesai: 0,
    pesanan_pending: 0,
  })

  useEffect(() => {
    fetch("http://localhost:8000/api/laporan")
      .then(res => res.json())
      .then((data: any) => {
        const bulan = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"]

        setRevenueData(
          data.pendapatan_chart.map((item: any) => ({
            name: bulan[item.bulan - 1],
            total: item.total
          }))
        )

        setOrderData(
          data.pesanan_chart.map((item: any) => ({
            name: bulan[item.bulan - 1],
            total: item.total
          }))
        )

       setTransactions(data.transactions)

        // ✅ KPI dari backend
        setKpi({
          total_pendapatan: data.total_pendapatan,
          total_pesanan: data.total_pesanan,
          pesanan_selesai: data.pesanan_selesai,
          pesanan_pending: data.pesanan_pending,
        })
      })
  }, [])

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Laporan</h1>
          </div>
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2 bg-transparent">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  
          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="text-2xl font-semibold">
                Rp {Number(kpi.total_pendapatan).toLocaleString("id-ID")}
              </div>
              <div className="text-sm text-gray-600">Total Pendapatan</div>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-2xl font-semibold">{kpi.total_pesanan}</div>
              <div className="text-sm text-gray-600">Total Pesanan</div>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-2xl font-semibold">{kpi.pesanan_selesai}</div>
              <div className="text-sm text-gray-600">Pesanan Selesai</div>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="text-2xl font-semibold">{kpi.pesanan_pending}</div>
              <div className="text-sm text-gray-600">Pesanan Pending</div>
            </CardContent>
          </Card>

        </div>

        <Tabs defaultValue="performance" className="space-y-6">

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Execution Trends */}
              <Card className="border-gray-200">
                <CardHeader>
                 <CardTitle className="text-lg font-semibold">Statistik Pendapatan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueData}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Area dataKey="total" stroke="#22c55e" fill="#22c55e" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Success vs Failed */}
              <Card className="border-gray-200">
                <CardHeader>
                   <CardTitle className="text-lg font-semibold">Jumlah Pesanan per Bulan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={orderData}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="total" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Average Duration */}
            <Card className="w-full border-gray-200">
              <CardHeader>
               <CardTitle className="text-lg font-semibold">Riwayat Transaksi</CardTitle>
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
                      <TableHead className="font-medium text-gray-600">Status</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {latestOrders.map((order) => (
                       <TableRow key={order.id}>
                          <TableCell className="text-blue-500 font-medium">
                            {order.invoice}
                          </TableCell>

                          <TableCell className="text-gray-700">{order.customer}</TableCell>

                          <TableCell className="text-gray-700">{order.product}</TableCell>

                          <TableCell className="text-gray-700">
                            Rp {Number(order.total).toLocaleString("id-ID")}
                          </TableCell>

                          <TableCell className="text-gray-700">{order.date}</TableCell>

                          <TableCell>
                            <Badge className="bg-green-100 text-green-600">
                              {order.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
