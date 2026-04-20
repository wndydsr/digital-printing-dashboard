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
import { Download } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import OrderDetailModal from "@/components/ui/order-detail"
import OrderCreateModal from "@/components/ui/order-create"
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
  order_code: string;    // ORD-001
  customer?: { name: string }; // 'Windy Destiana'
  order_date: string;
  total_price: number;   // 50000
  stage?: {
    id: number
    name: string
    status?: {
      id: number
    name: string
  }
}   
  status_id: number;       // 'pending' atau 'completed'
  created_by: number;
  notes: string;         // 'Cetak banner'
  created_at: string;  
  product?: {
    id: number
    name: string
  }
}


export default function AnalyticsPage() {
      const [selectedPeriod, setSelectedPeriod] = useState("Last 30 days")
      const [orders, setOrders] = useState<Order[]>([])
  
      const [selectedOrder, setSelectedOrder] = useState<any>(null)
      const [openDetail, setOpenDetail] = useState(false)
      const [timeRange, setTimeRange] = useState("30d")

      const [currentPage, setCurrentPage] = useState(1)
      const itemsPerPage = 10

      const sortedOrders = [...orders].sort(
        (a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime()
      )

      const startIndex = (currentPage - 1) * itemsPerPage

      const currentData = sortedOrders.slice(
        startIndex,
        startIndex + itemsPerPage
      )

      const totalPages = Math.ceil(sortedOrders.length / itemsPerPage)

      const [openCreate, setOpenCreate] = useState(false)
      
      const stageColorByName: Record<string, string> = {
        "butuh desain": "text-red-500 border-red-200 bg-red-50/30",
        "siap cetak": "text-yellow-500 border-yellow-200 bg-yellow-50/30",
        "cetak": "text-blue-500 border-blue-200 bg-blue-50/30",
        "desain": "text-blue-500 border-blue-50 bg-blue-50/30",
        "selesai": "text-green-500 border-green-200 bg-green-50/30",
      }
    
      const menunggu = orders.filter(
        o => o.stage?.status?.name?.toLowerCase() === 'pending'
      ).length

      const diproses = orders.filter(
        o => o.stage?.status?.name?.toLowerCase() === 'diproses'
      ).length

      const selesai = orders.filter(
        o => o.stage?.status?.name?.toLowerCase() === 'selesai'
      ).length
    
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

const fetchOrders = () => {
  fetch("http://127.0.0.1:8000/api/orders")
    .then((res) => res.json())
    .then((data: Order[]) => {
      setOrders(data)
    })
    .catch((err) => console.error(err))
}

useEffect(() => {
  fetchOrders()
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
            <Button variant="outline" className="gap-2 bg-transparent">
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
        {/* Workflow Status Table */}
              <div className="mt-8"></div>
              <Card className="w-full border-gray-200">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold">Recent Workflow Runs</CardTitle>
                      <CardDescription>Monitor your workflow executions and performance</CardDescription>
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
                      {currentData.map((order) => (
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
                   {/* PAGINATION DI DALAM CARD */}
                    <div className="flex items-center justify-between w-full px-4 py-3 border-t bg-gray-50">
                      
                      {/* INFO */}
                      <span className="text-sm text-gray-500">
                        {startIndex + 1} - {Math.min(startIndex + itemsPerPage, orders.length)} of {orders.length} Pages
                      </span>

                      {/* PAGINATION */}
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
                              onClick={() =>
                                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                              }
                            />
                          </PaginationItem>

                        </PaginationContent>
                      </Pagination>
                    </div>
                </CardContent>
              </Card>
              <OrderDetailModal
              open={openDetail}
              onClose={() => setOpenDetail(false)}
              order={selectedOrder}
            />
            <OrderCreateModal
              open={openCreate}
              onClose={() => setOpenCreate(false)}
              onSuccess={() => {
                fetchOrders()
                setCurrentPage(1)
              }}
            />
      </div>
    </DashboardLayout>
  )
}
