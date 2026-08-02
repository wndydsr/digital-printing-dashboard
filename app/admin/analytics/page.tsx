"use client"

import { useEffect, useState, useRef } from "react"
import { BarChart3, Activity, Clock, CheckCircle, Download, FileText, Printer } from "lucide-react"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"
import { DashboardLayout } from "@/components/dashboard-layout"
import InvoiceOrder from "@/components/ui/invoice-order"
import { useReactToPrint } from "react-to-print"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { apiFetch } from "@/lib/api"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const monthsList = [
  { value: "all", label: "Semua Bulan" },
  { value: "01", label: "Januari" },
  { value: "02", label: "Februari" },
  { value: "03", label: "Maret" },
  { value: "04", label: "April" },
  { value: "05", label: "Mei" },
  { value: "06", label: "Juni" },
  { value: "07", label: "Juli" },
  { value: "08", label: "Agustus" },
  { value: "09", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
]

const currentYearNum = new Date().getFullYear()
const yearsList = Array.from({ length: 5 }, (_, i) => (currentYearNum - i).toString())

function getPaginationPages(current: number, total: number) {
  const delta = 2; 
  const range: number[] = [];
  const rangeWithDots: (number | string)[] = [];
  let l: number | undefined;

  for (let i = 1; i <= total; i++) {
    if (
      i === 1 ||
      i === total ||
      (i >= current - delta && i <= current + delta)
    ) {
      range.push(i);
    }
  }

  range.forEach((i) => {
    if (l) {
      if (i - l === 2) {
        rangeWithDots.push(l + 1);
      } else if (i - l !== 1) {
        rangeWithDots.push("...");
      }
    }
    rangeWithDots.push(i);
    l = i;
  });

  return rangeWithDots;
}

export default function AnalyticsPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>("all")
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())

  const [revenueData, setRevenueData] = useState<any[]>([])
  const [orderData, setOrderData] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [showInvoice, setShowInvoice] = useState(false)

  // Pagination untuk Riwayat Transaksi
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [kpi, setKpi] = useState<any>({
    total_pendapatan: 0,
    total_pesanan: 0,
    pesanan_selesai: 0,
    pesanan_pending: 0,
  })

  const analyticsInvoiceRef = useRef<HTMLDivElement>(null)
  const handlePrintAnalytics = useReactToPrint({
    contentRef: analyticsInvoiceRef,
  })

  useEffect(() => {
    const load = async () => {
      try {
        const orderDataRes = await apiFetch("/orders")
        const rawOrders = Array.isArray(orderDataRes) ? orderDataRes : orderDataRes.data || []

        // 1. Filter berdasarkan Bulan & Tahun
        const filteredOrders = rawOrders.filter((order: any) => {
          const orderDateStr = order.order_date ? order.order_date.replace(" ", "T") : order.created_at
          if (!orderDateStr) return true
          
          const orderDate = new Date(orderDateStr)
          if (isNaN(orderDate.getTime())) return true

          const itemYear = orderDate.getFullYear().toString()
          const itemMonth = String(orderDate.getMonth() + 1).padStart(2, "0")

          const matchesYear = selectedYear === "all" || itemYear === selectedYear
          const matchesMonth = selectedMonth === "all" || itemMonth === selectedMonth

          return matchesYear && matchesMonth
        })

        // 2. Kalkulasi Total Pendapatan (Kecuali Stage 7 = Menunggu Pembayaran dan Stage 8 = Dibatalkan)
        const validPaidOrders = filteredOrders.filter((o: any) => {
          const stageId = Number(o.current_stage_id || 0)
          return stageId !== 7 && stageId !== 8
        })

        const totalPendapatan = validPaidOrders.reduce((acc: number, curr: any) => acc + Number(curr.total_price || curr.total || 0), 0)

        const pesananSelesai = filteredOrders.filter((o: any) => {
          const statusName = (o.stage?.status?.name || "").toLowerCase()
          const stageName = (o.stage?.name || "").toLowerCase()
          return statusName === 'selesai' || stageName === 'selesai'
        }).length

        const pesananPending = filteredOrders.filter((o: any) => {
          const statusName = (o.stage?.status?.name || "").toLowerCase()
          const stageName = (o.stage?.name || "").toLowerCase()
          return statusName === 'pending' || statusName === 'diproses' || stageName.includes('desain') || stageName.includes('cetak') || Number(o.current_stage_id) === 7
        }).length

        setKpi({
          total_pendapatan: totalPendapatan,
          total_pesanan: filteredOrders.length,
          pesanan_selesai: pesananSelesai,
          pesanan_pending: pesananPending,
        })

        // Format data untuk tabel riwayat transaksi (Semua pesanan yang terfilter)
        const formattedTransactions = filteredOrders.map((o: any) => ({
          id: o.id,
          invoice: o.order_code || `ORD-${String(o.id).padStart(5, "0")}`,
          customer: o.customer,
          products: (o.items || []).map((i: any) => ({ product_name: i.product?.name || "-" })),
          total: o.total_price || o.total || 0,
          date: o.order_date ? new Date(o.order_date).toLocaleDateString("id-ID") : "-",
          status: o.stage?.name || "Diproses"
        }))

        setTransactions(formattedTransactions)
        setCurrentPage(1) // Reset ke halaman 1 saat filter berubah

        // 3. Kalkulasi Grafik 12 Bulan (Berdasarkan Tahun yang Dipilih, mengabaikan stage 7 & 8 untuk pendapatan)
        const chartOrders = rawOrders.filter((order: any) => {
          const orderDateStr = order.order_date ? order.order_date.replace(" ", "T") : order.created_at
          const orderDate = new Date(orderDateStr)
          if (isNaN(orderDate.getTime())) return false
          return selectedYear === "all" || orderDate.getFullYear().toString() === selectedYear
        })

        const bulan = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"]
        const monthlyRevenueMap = Array(12).fill(0)
        const monthlyOrderMap = Array(12).fill(0)

        chartOrders.forEach((order: any) => {
          const orderDateStr = order.order_date ? order.order_date.replace(" ", "T") : order.created_at
          const date = new Date(orderDateStr)
          if (!isNaN(date.getTime())) {
            const monthIndex = date.getMonth()
            const stageId = Number(order.current_stage_id || 0)
            
            // Pendapatan hanya masuk jika bukan menunggu pembayaran (7) atau dibatalkan (8)
            if (stageId !== 7 && stageId !== 8) {
              monthlyRevenueMap[monthIndex] += Number(order.total_price || order.total || 0)
            }
            monthlyOrderMap[monthIndex] += 1
          }
        })

        setRevenueData(bulan.map((m, i) => ({ name: m, total: monthlyRevenueMap[i] })))
        setOrderData(bulan.map((m, i) => ({ name: m, total: monthlyOrderMap[i] })))

      } catch (err) {
        console.error("Laporan error:", err)
      }
    }
    load()
  }, [selectedMonth, selectedYear])

  // Logika Pagination untuk Riwayat Transaksi
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentTableData = transactions.slice(startIndex, startIndex + itemsPerPage)
  const totalPages = Math.ceil(transactions.length / itemsPerPage || 1)

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Laporan & Analitik</h1>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-36 bg-white">
                <SelectValue placeholder="Pilih Bulan" />
              </SelectTrigger>
              <SelectContent>
                {monthsList.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-28 bg-white">
                <SelectValue placeholder="Pilih Tahun" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tahun</SelectItem>
                {yearsList.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" className="gap-2 bg-white">
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
              <div className="text-sm text-gray-600">Total Pendapatan (Lunas)</div>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-2xl font-semibold">{kpi.total_pesanan}</div>
              <div className="text-sm text-gray-600">Total Pesanan Masuk</div>
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
              <div className="text-sm text-gray-600">Pesanan Pending / Proses</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="performance" className="space-y-6">
          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                        <Area type="monotone" dataKey="total" stroke="#22c55e" fill="#22c55e" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

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

            <Card className="w-full border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Riwayat Transaksi (Berdasarkan Filter)</CardTitle>
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
                      <TableHead className="font-medium text-gray-600 text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {currentTableData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 text-gray-500">
                          Tidak ada riwayat transaksi pada periode ini
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentTableData.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="text-blue-500 font-medium">
                            {order.invoice}
                          </TableCell>
                          <TableCell>{order.customer?.name || "-"}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {order.products?.map((item: any, index: number) => (
                                <div key={index} className="text-sm">
                                  {item.product_name}
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            Rp {Number(order.total || 0).toLocaleString("id-ID")}
                          </TableCell>
                          <TableCell>{order.date || "-"}</TableCell>
                          <TableCell>
                            <Badge className="bg-blue-100 text-blue-600">
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <button
                              onClick={() => {
                                setSelectedInvoice(order)
                                setShowInvoice(true)
                              }}
                              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border hover:bg-gray-100 transition"
                            >
                              <FileText className="w-4 h-4 text-blue-600" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* PAGINATION */}
                <div className="flex items-center justify-between w-full px-4 py-3 border-t bg-gray-50">
                  <span className="text-sm text-gray-500">
                    {transactions.length > 0 ? startIndex + 1 : 0} - {Math.min(startIndex + itemsPerPage, transactions.length)} of {transactions.length} items
                  </span>

                  <Pagination className="mx-0 w-auto justify-end"> 
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage((prev) => Math.max(prev - 1, 1));
                          }} 
                        />
                      </PaginationItem>
                      
                      {getPaginationPages(currentPage, totalPages).map((page, i) => {
                        if (page === "...") {
                          return (
                            <PaginationItem key={`dot-${i}`}>
                              <span className="px-3 py-2 text-sm text-gray-400">...</span>
                            </PaginationItem>
                          );
                        }

                        const pageNumber = Number(page);
                        return (
                          <PaginationItem key={pageNumber}>
                            <PaginationLink
                              href="#"
                              isActive={currentPage === pageNumber}
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(pageNumber);
                              }}
                            >
                              {pageNumber}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}

                      <PaginationItem>
                        <PaginationNext 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage((prev) => Math.min(prev + 1, totalPages));
                          }} 
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* DIALOG INVOICE VIEW */}
        <Dialog open={showInvoice} onOpenChange={setShowInvoice}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl">
            <DialogHeader>
              <DialogTitle>Invoice Order</DialogTitle>
            </DialogHeader>

            {selectedInvoice && (
              <>
                <InvoiceOrder
                  ref={analyticsInvoiceRef}
                  orderId={selectedInvoice.invoice}
                  customer={selectedInvoice.customer}
                  products={selectedInvoice.products}
                  total={selectedInvoice.total}
                  deliveryMethod="delivery"
                  paymentMethod="cash"
                  hideButton={true}
                />

                <div className="flex gap-3 mt-5 print:hidden">
                  <button
                    onClick={() => setShowInvoice(false)}
                    className="flex-1 border rounded-xl p-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                  >
                    Close
                  </button>

                  <Button
                    onClick={() => handlePrintAnalytics()}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2 h-auto py-4 rounded-xl font-semibold shadow-sm text-sm"
                  >
                    <Printer className="w-4 h-4" /> Cetak Invoice
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}