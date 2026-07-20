"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
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
// 🔥 TAMBAHAN: modal invoice + dialog, dipakai untuk munculkan invoice setelah redirect balik dari Midtrans
import InvoiceOrder from "@/components/ui/invoice-order"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// ─── 🛠️ INTERFACE FLAT ITEM PRODUK ───
interface AdminFlatOrderItem {
  id: number;           // ID order induk
  item_id: number;      // ID detail item (OrderItem)
  order_code: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  product_name: string;
  quantity: number;
  subtotal: number;
  order_date: string;
  created_at: string;   
  shipping_method: string;
  shipping_cost: number;
  shipping_latitude: string | null;
  shipping_longitude: string | null;
  designer?: { id: number; name: string } | null;
  stage_name: string;
  raw_order_payload: any; 
}

interface Designer {
  id: number;
  name: string;
}

function AnalyticsPageContent() {
  const [orders, setOrders] = useState<any[]>([])
  const [flatItems, setFlatItems] = useState<AdminFlatOrderItem[]>([]) 
  const [designers, setDesigners] = useState<Designer[]>([]) 

  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [openDetail, setOpenDetail] = useState(false)
  const [timeRange, setTimeRange] = useState("30d")
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [openCreate, setOpenCreate] = useState(false)
  const [openDelete, setOpenDelete] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  // 🔥 TAMBAHAN: state untuk modal invoice hasil redirect balik dari Midtrans (mis. DANA/e-wallet)
  const searchParams = useSearchParams()
  const router = useRouter()
  const [showRedirectInvoice, setShowRedirectInvoice] = useState(false)
  const [redirectInvoiceData, setRedirectInvoiceData] = useState<any>(null)
  const redirectInvoiceRef = useRef<HTMLDivElement>(null)

  const itemsPerPage = 10

  const filteredItems = flatItems.filter((item) => {
    const keyword = search.toLowerCase()
    return (
      item.order_code?.toLowerCase().includes(keyword) ||
      item.customer_name?.toLowerCase().includes(keyword) ||
      item.product_name?.toLowerCase().includes(keyword)
    )
  })

  const startIndex = (currentPage - 1) * itemsPerPage
  const currentData = filteredItems.slice(startIndex, startIndex + itemsPerPage)
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage || 1) 

  // ─── 🎨 PEMETAAN WARNA BADGE STAGE KERJA ───
  const stageColorByName: Record<string, string> = {
    "butuh desain": "text-red-500 border-red-200 bg-red-50/30",
    "antrean desain": "text-orange-500 border-orange-200 bg-orange-50/30",
    "siap cetak": "text-yellow-500 border-yellow-200 bg-yellow-50/30",
    "cetak": "text-blue-500 border-blue-200 bg-blue-50/30",
    "desain": "text-blue-500 border-blue-500 bg-blue-50/30",
    "selesai": "text-green-500 border-green-200 bg-green-50/30",
  }

  const fetchOrders = () => {
    apiFetch(`/orders`)
      .then((data: any) => {
        const result = Array.isArray(data) ? data : data.data || []
        setOrders(result)

        const rows: AdminFlatOrderItem[] = [] 
        
        result.forEach((order: any) => {
          // 🌟 1. Abaikan order induk jika berada di Stage 7 (Menunggu Pembayaran) atau Stage 8 (Dibatalkan)
          if (order.current_stage_id === 7 || order.current_stage_id === 8) {
            return;
          }

          if (order && Array.isArray(order.items)) {
            order.items.forEach((item: any) => {
              // 🌟 2. Abaikan detail item jika berada di Stage 7 atau Stage 8
              if (item.order_stage_id === 7 || item.order_stage_id === 8) {
                return;
              }

              rows.push({
                id: order.id, 
                item_id: item.id,
                order_code: order.order_code || "-",
                customer_name: order.customer?.name || "-",
                customer_phone: order.customer?.phone || "-",
                customer_address: order.customer?.address || null,
                product_name: item.product?.name || "-",
                quantity: item.quantity || 1,
                subtotal: item.subtotal || (Number(item.price || 0) * Number(item.quantity || 1)),
                stage_name: item.stage?.name || order.stage?.name || "Antrean Desain",
                created_at: order.created_at || new Date().toISOString(), 
                order_date: order.order_date || new Date().toISOString(),
                shipping_method: order.shipping_method || "pickup",
                shipping_cost: order.shipping_cost || 0,
                shipping_latitude: order.shipping_latitude || null,
                shipping_longitude: order.shipping_longitude || null,
                designer: order.designer || null,
                raw_order_payload: order 
              })
            })
          }
        })
        setFlatItems(rows)
      })
      .catch((err) => {
        console.error("🔴 Error fetching orders:", err)
        setFlatItems([])
      })
  }
  const fetchDesigners = () => {
    apiFetch(`/users?role=desainer`)
      .then((data: any) => {
        const result = Array.isArray(data) ? data : data.data || []
        setDesigners(result)
      })
      .catch((err) => console.error(err))
  }

  const handleAssignDesigner = async (orderId: number, designerId: string) => {
    try {
      await apiFetch(`/orders/${orderId}/assign-designer`, {
        method: "PUT",
        body: JSON.stringify({ designer_id: Number(designerId) }),
      })
      fetchOrders() 
    } catch (err) {
      console.error(err)
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

  const handleExportExcel = () => {
    if (flatItems.length === 0) {
      alert("Tidak ada data pesanan untuk di-export.")
      return
    }

    const headers = ["No Pesanan", "Nama Pelanggan", "Item Produk", "Qty", "Subtotal (Rp)", "Tanggal Pemesanan", "Nama Desainer", "Tahap Kerja"]

    const csvRows = filteredItems.map((item) => {
      const formattedDate = new Date(item.created_at).toLocaleDateString("id-ID", {
        year: "numeric", month: "2-digit", day: "2-digit"
      })
      
      return [
        `"${item.order_code}"`,
        `"${item.customer_name}"`,
        `"${item.product_name}"`,
        item.quantity,
        item.subtotal,
        `"${formattedDate}"`,
        `"${item.designer?.name || "-"}"`,
        `"${item.stage_name}"`
      ].join(",")
    })

    const csvContent = [headers.join(","), ...csvRows].join("\n")
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `Laporan_Produksi_Item_${new Date().toISOString().slice(0,10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  useEffect(() => {
    fetchOrders()
    fetchDesigners()
  }, [])

  // 🔥 TAMBAHAN: deteksi redirect balik dari Midtrans (mis. DANA/GoPay/e-wallet yang redirect penuh)
  // Midtrans menempelkan query params ke URL "finish": ?order_id=...&status_code=...&transaction_status=...
  useEffect(() => {
    const orderId = searchParams.get("order_id")
    const transactionStatus = searchParams.get("transaction_status")

    if (!orderId) return

    const handleMidtransRedirectBack = async () => {
      try {
        const order = await apiFetch(`/orders/${orderId}`)
        const orderData = order?.data || order

        if (transactionStatus === "settlement" || transactionStatus === "capture" || transactionStatus === "pending") {
          // Susun data untuk komponen InvoiceOrder, mengikuti bentuk yang sama seperti di PaymentModal
          const mappedProducts = (orderData.items || []).map((item: any) => ({
            product_name: item.product?.name || "-",
            quantity: item.quantity || 1,
            price: item.price || 0,
          }))

          setRedirectInvoiceData({
            orderId: `ORD-${String(orderData.id).padStart(5, "0")}`,
            customer: orderData.customer || null,
            products: mappedProducts,
            total: orderData.total_price || 0,
            deliveryMethod: orderData.shipping_method || "pickup",
            paymentMethod: transactionStatus === "pending" ? "Menunggu Pembayaran" : "Online (Midtrans)",
          })
          setShowRedirectInvoice(true)

          // Refresh list order supaya status/stage ter-update
          fetchOrders()
        } else {
          alert("Transaksi dibatalkan/gagal. Cek kembali status pesanan.")
        }
      } catch (err) {
        console.error("Gagal memuat data order setelah redirect Midtrans:", err)
      } finally {
        // Bersihkan query string dari URL supaya modal tidak terbuka ulang saat refresh manual
        router.replace("/admin/pesanan")
      }
    }

    handleMidtransRedirectBack()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Monitoring Antrian Kerja (Per Item)</h1>
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
            
            <Button onClick={handleExportExcel} variant="outline" className="gap-2 bg-transparent">
              <Download className="w-4 h-4" />
              Export csv
            </Button>
            
            <Button onClick={() => setOpenCreate(true)} className="bg-purple-600 hover:bg-purple-700 gap-2">
              <Plus className="w-4 h-4" />
              Tambah
            </Button>
          </div>
        </div>

        {/* SEARCH */}
        <Input
          placeholder="Cari No. Order, pelanggan atau produk..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />

        {/* Workflow Status Table */}
        <Card className="w-full border-gray-200 mt-4">    
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
                {currentData.map((item, idx) => (
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

                    {/* Alokasi Tugas Desainer */}
                    <TableCell className="min-w-[160px]">
                      {item.stage_name.toLowerCase() === "menunggu pembayaran" ? (
                        <Badge variant="outline" className="rounded-md px-2.5 py-1 font-normal text-amber-600 border-amber-200 bg-amber-50">
                          Menunggu Pembayaran
                        </Badge>
                      ) : item.stage_name.toLowerCase() === "siap cetak" || 
                        item.stage_name.toLowerCase() === "cetak" || 
                        item.stage_name.toLowerCase() === "selesai" ? (
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

                    {/* BADGE STAGE MANDIRI PER ITEM */}
                    <TableCell>
                      <Badge variant="outline" className={`rounded-md px-3 py-1 font-normal border ${stageColorByName[item.stage_name.toLowerCase()] || 'text-gray-500 border-gray-200 bg-gray-50'}`}>
                        {item.stage_name}
                      </Badge>
                    </TableCell>

                    {/* AKSI */}
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

            {/* PAGINATION */}
            <div className="flex items-center justify-between w-full px-4 py-3 border-t bg-gray-50">
              <span className="text-sm text-gray-500">
                {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredItems.length)} of {filteredItems.length} items
              </span>

              <Pagination className="mx-0 w-auto justify-end"> 
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious href="#" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink href="#" isActive={currentPage === i + 1} onClick={() => setCurrentPage(i + 1)}>
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext href="#" onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </CardContent>
        </Card>

        {/* Modal Components */}
        <OrderDetailModal open={openDetail} onClose={() => setOpenDetail(false)} order={selectedOrder} />
        <OrderCreateModal open={openCreate} onClose={() => setOpenCreate(false)} onSuccess={() => { fetchOrders(); setCurrentPage(1); }} />
        <DeleteModal open={openDelete} onClose={() => setOpenDelete(false)} onDelete={handleDelete} />

        {/* 🔥 TAMBAHAN: Modal invoice khusus hasil redirect balik dari Midtrans (DANA/e-wallet dsb) */}
        <Dialog open={showRedirectInvoice} onOpenChange={setShowRedirectInvoice}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl">
            <DialogHeader>
              <DialogTitle>Invoice Order</DialogTitle>
            </DialogHeader>

            {redirectInvoiceData && (
              <InvoiceOrder
                ref={redirectInvoiceRef}
                orderId={redirectInvoiceData.orderId}
                customer={redirectInvoiceData.customer}
                products={redirectInvoiceData.products}
                total={redirectInvoiceData.total}
                deliveryMethod={redirectInvoiceData.deliveryMethod}
                paymentMethod={redirectInvoiceData.paymentMethod}
                hideButton={false}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

// 🔥 TAMBAHAN: bungkus dengan Suspense karena useSearchParams wajib berada di dalam Suspense boundary
export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-500">Memuat halaman pesanan...</div>}>
      <AnalyticsPageContent />
    </Suspense>
  )
}