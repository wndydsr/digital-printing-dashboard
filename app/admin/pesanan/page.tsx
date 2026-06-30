"use client"

import { useState, useEffect } from "react"
import {
  Plus,
  Eye,
  Trash2,
  Download,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import OrderDetailModal from "@/components/ui/order-detail"
import OrderCreateModal from "@/components/ui/order-create"
import DeleteModal from "@/components/ui/DeleteModal"
import { apiFetch } from "@/lib/api"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

interface Order {
  id: number;
  order_code: string;
  customer?: { name: string };
  order_date: string;
  total_price: number;
  designer_id?: number | null; 
  designer?: { id: number; name: string } | null; 
  items?: {
    id: number
    quantity: number
    subtotal: number
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

interface Designer {
  id: number;
  name: string;
}

export default function AnalyticsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("Last 30 days")
  const [orders, setOrders] = useState<Order[]>([])
  const [designers, setDesigners] = useState<Designer[]>([]) 

  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [openDetail, setOpenDetail] = useState(false)
  const [timeRange, setTimeRange] = useState("30d")
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [openCreate, setOpenCreate] = useState(false)
  const [openDelete, setOpenDelete] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const itemsPerPage = 10

  const filteredOrders = orders.filter((order) => {
    const keyword = search.toLowerCase()
    return (
      order.order_code?.toLowerCase().includes(keyword) ||
      order.customer?.name?.toLowerCase().includes(keyword) ||
      order.items?.map((item: any) => item.product?.name).join(", ").toLowerCase().includes(keyword)
    )
  })

  const startIndex = (currentPage - 1) * itemsPerPage
  const currentData = filteredOrders.slice(startIndex, startIndex + itemsPerPage)
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)

  const stageColorByName: Record<string, string> = {
    "butuh desain": "text-red-500 border-red-200 bg-red-50/30",
    "siap cetak": "text-yellow-500 border-yellow-200 bg-yellow-50/30",
    "cetak": "text-blue-500 border-blue-200 bg-blue-50/30",
    "desain": "text-blue-500 border-blue-50 bg-blue-50/30",
    "selesai": "text-green-500 border-green-200 bg-green-50/30",
  }

  const statusColorMap: Record<number, string> = {
    1: "bg-yellow-100 text-yellow-600", 
    2: "bg-blue-100 text-blue-600",     
    3: "bg-green-100 text-green-600",   
  }

  const fetchOrders = () => {
    apiFetch(`/orders`)
      .then((data) => {
        const result = Array.isArray(data)
          ? data
          : Array.isArray(data.data)
          ? data.data
          : []
        setOrders(result)
      })
      .catch(console.error)
  }

  const fetchDesigners = () => {
    apiFetch(`/users?role=desainer`)
      .then((data: any) => {
        const result = Array.isArray(data) ? data : data.data || []
        setDesigners(result)
      })
      .catch((err) => {
        console.error("Gagal mengambil data desainer dari API:", err)
      })
  }

  const handleAssignDesigner = async (orderId: number, designerId: string) => {
    try {
      await apiFetch(`/orders/${orderId}/assign-designer`, {
        method: "PUT",
        body: JSON.stringify({ designer_id: Number(designerId) }),
      })
      fetchOrders() 
    } catch (err) {
      console.error("Gagal menugaskan desainer:", err)
    }
  }

  const handleDelete = async () => {
    if (!selectedId) return
    try {
      await apiFetch(`/orders/${selectedId}`, { method: "DELETE" })
      fetchOrders()
      setOpenDelete(false)
      setSelectedId(null)
    } catch (err) {
      console.error(err)
    }
  }

  // 🛠️ FUNGSI EXCEL DOWNLOAD GENERATOR (NATIVE CSV METHOD)
  const handleExportExcel = () => {
    if (orders.length === 0) {
      alert("Tidak ada data pesanan untuk di-export.")
      return
    }

    // 1. Tentukan Header Kolom Excel
    const headers = ["No Pesanan", "Nama Pelanggan", "Produk yang Dipesan", "Total Harga (Rp)", "Tanggal Pemesanan", "Nama Desainer", "Tahap Kerja", "Status"]

    // 2. Map data order ke bentuk baris Excel
    const csvRows = filteredOrders.map((order) => {
      const productNames = order.items?.map((item) => item.product?.name).join(" | ") || "-"
      const formattedDate = new Date(order.order_date).toLocaleDateString("id-ID", {
        year: "numeric", month: "2-digit", day: "2-digit"
      })
      
      return [
        `"${order.order_code}"`, // Dibungkus kutip agar string code aman
        `"${order.customer?.name || "-"}"`,
        `"${productNames}"`,
        order.total_price,
        `"${formattedDate}"`,
        `"${order.designer?.name || "-"}"`,
        `"${order.stage?.name || "-"}"`,
        `"${order.stage?.status?.name || "-"}"`
      ].join(",")
    })

    // 3. Gabungkan header dan isi baris
    const csvContent = [headers.join(","), ...csvRows].join("\n")

    // 4. Tambahkan BOM (\uFEFF) supaya Excel membaca encoding UTF-8 (mencegah karakter berantakan)
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    
    // 5. Trigger download otomatis dari browser
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `Laporan_Pesanan_Prinora_${new Date().toISOString().slice(0,10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  useEffect(() => {
    fetchOrders()
    fetchDesigners()
  }, [])

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Pesanan</h1>
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
            
            {/* 🛠️ PASANG FITUR EXCEL DI BUTTON EXPORT */}
            <Button onClick={handleExportExcel} variant="outline" className="gap-2 bg-transparent">
              <Download className="w-4 h-4" />
              Export
            </Button>
            
            <Button
              onClick={() => setOpenCreate(true)}
              className="bg-purple-600 hover:bg-purple-700 gap-2"
            >
              <Plus className="w-4 h-4" />
              Tambah
            </Button>
          </div>
        </div>

        {/* SEARCH */}
        <Input
          placeholder="Cari nama pelanggan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />

        {/* Workflow Status Table */}
        <div className="mt-8"></div>
        <Card className="w-full border-gray-200">    
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead className="font-medium text-gray-600">No Pesanan</TableHead>
                  <TableHead className="font-medium text-gray-600">Pelanggan</TableHead>
                  <TableHead className="font-medium text-gray-600">Produk</TableHead>
                  <TableHead className="font-medium text-gray-600">Total</TableHead>
                  <TableHead className="font-medium text-gray-600">Tanggal</TableHead>
                  <TableHead className="font-medium text-gray-600">Desainer</TableHead>
                  <TableHead className="font-medium text-gray-600">Tahap</TableHead>
                  <TableHead className="font-medium text-gray-600">Status</TableHead>
                  <TableHead className="font-medium text-gray-600 text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentData.map((order) => (
                  <TableRow key={order.id} className="hover:bg-gray-50/80 transition-colors border-b border-gray-100">
                    <TableCell className="text-blue-500 font-medium">{order.order_code}</TableCell>
                    <TableCell className="text-gray-700">{order.customer?.name}</TableCell>
                    <TableCell className="text-gray-700">
                      {order.items?.map((item: any) => item.product?.name).join(", ") || "-"}
                    </TableCell>
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

                  <TableCell className="min-w-[160px]">
                    {order.stage?.name?.toLowerCase() === "siap cetak" || 
                    order.stage?.name?.toLowerCase() === "cetak" || 
                    order.stage?.name?.toLowerCase() === "selesai" ? (
                      <Badge 
                        variant="outline" 
                        className="rounded-md px-2.5 py-1 font-normal text-gray-400 border-gray-200 bg-gray-50/50"
                      >
                        File Siap Cetak (Tanpa Desainer)
                      </Badge>
                    ) : (
                      <Select
                        value={order.designer?.id?.toString() || "unassigned"}
                        onValueChange={(val) => handleAssignDesigner(order.id, val)}
                      >
                        <SelectTrigger 
                          className={`h-8 w-full border text-xs font-medium transition-colors ${
                            !order.designer 
                              ? 'text-amber-600 border-amber-200 bg-amber-50/40 font-semibold shadow-sm' 
                              : 'text-gray-700 border-gray-200 bg-white hover:bg-gray-50' 
                          }`}
                        >
                          <SelectValue placeholder="Pilih Desainer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned" disabled className="text-xs text-gray-400">Belum Ditugaskan</SelectItem>
                          {designers.map((designer) => (
                            <SelectItem key={designer.id} value={designer.id.toString()} className="text-xs">
                              {designer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>

                    <TableCell>
                      <Badge variant="outline" className={`rounded-md px-3 py-1 font-normal border ${stageColorByName[order.stage?.name?.toLowerCase() || ''] || 'text-gray-500 border-gray-200 bg-gray-50'}`}>
                        {order.stage?.name || '-'}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge className={`rounded-md px-4 py-1 border-none font-medium shadow-none ${statusColorMap[order.stage?.status?.id || 0] || 'bg-gray-100 text-gray-500'}`}>
                        {order.stage?.status?.name || '-'}
                      </Badge>
                    </TableCell>

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
                        <button  
                          onClick={() => {
                            setSelectedId(order.id)
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

            {/* PAGINATION */}
            <div className="flex items-center justify-between w-full px-4 py-3 border-t bg-gray-50">
              <span className="text-sm text-gray-500">
                {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredOrders.length)} of {filteredOrders.length} items
              </span>

              <Pagination className="mx-0 w-auto justify-end"> 
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

        {/* Modal-modal */}
        <OrderDetailModal open={openDetail} onClose={() => setOpenDetail(false)} order={selectedOrder} />
        <OrderCreateModal open={openCreate} onClose={() => setOpenCreate(false)} onSuccess={() => { fetchOrders(); setCurrentPage(1); }} />
        <DeleteModal open={openDelete} onClose={() => setOpenDelete(false)} onDelete={handleDelete} />
      </div>
    </DashboardLayout>
  )
}