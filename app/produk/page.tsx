"use client"

import { useEffect, useState } from "react"
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
  Trash2,
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
import ProductCreateModal from "@/components/ui/product-create"
import DeleteModal from "@/components/ui/DeleteModal"
import ProductDetailModal from "@/components/ui/product-detail"
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

interface Product {
  id: number
  name: string
  price: number
  estimated_duration: number
  photo?: string
  status: number
}


export default function ProductPage() {
      const [selectedPeriod, setSelectedPeriod] = useState("Last 30 days")
      const [products, setProducts] = useState<Product[]>([])
  
      const [timeRange, setTimeRange] = useState("30d")
      const [search, setSearch] = useState("")

      const [currentPage, setCurrentPage] = useState(1)
      const itemsPerPage = 10

      const filteredProducts = products.filter((p) => {
        const keyword = search.toLowerCase()

        return (p.name || "").toLowerCase().includes(keyword)
      })

      const startIndex = (currentPage - 1) * itemsPerPage

      const currentData = filteredProducts.slice(
        startIndex,
        startIndex + itemsPerPage
      )
      
      const [openDetail, setOpenDetail] = useState(false)
      const [selectedProduct, setSelectedProduct] = useState<any>(null)

      const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)

      const [openCreate, setOpenCreate] = useState(false)
      const [fields, setFields] = useState<any[]>([])
    
    
      const statusColorMap: Record<number, string> = {
      1: "bg-yellow-100 text-yellow-600", // Pending
      2: "bg-blue-100 text-blue-600",     // Diproses
      3: "bg-green-100 text-green-600",   // Selesai
    }

    const addField = () => {
      setFields([
        ...fields,
        { name: "", label: "", type: "text" }
      ])
    }
    
    const updateField = (index: number, key: string, value: string) => {
      const newFields = [...fields]
      newFields[index][key] = value
      setFields(newFields)
    }
    
    const removeField = (index: number) => {
      setFields(fields.filter((_, i) => i !== index))
    }

const fetchProducts = () => {
  fetch("http://127.0.0.1:8000/api/products")
    .then((res) => res.json())
    .then((data: Product[]) => {
      setProducts(data)
    })
    .catch((err) => console.error(err))
}

  const [openDelete, setOpenDelete] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const handleDelete = async () => {
    if (!selectedId) return

    try {
      await fetch(`http://127.0.0.1:8000/api/products/${selectedId}`, {
        method: "DELETE",
      })

      console.log("Data kehapus")

      // refresh data
      fetchProducts()

      // reset
      setOpenDelete(false)
      setSelectedId(null)
    } catch (err) {
      console.error(err)
    }
  }

useEffect(() => {
  fetchProducts()
}, [])

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Produk</h1>
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
          {/* SEARCH */}
        <Input
          placeholder="Cari nama produk..."
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
                      <TableHead>No</TableHead>
                      <TableHead className="font-medium text-gray-600">Foto</TableHead>
                      <TableHead className="font-medium text-gray-600">Nama Produk</TableHead>
                      <TableHead className="font-medium text-gray-600">Harga</TableHead>
                      <TableHead className="font-medium text-gray-600">Estimmasi</TableHead>
                      <TableHead className="font-medium text-gray-600">Status</TableHead>
                      <TableHead className="font-medium text-gray-600 text-center">Aksi</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentData.map((product, index) => (
                        <TableRow key={product.id}>
                          
                          {/* NO */}
                          <TableCell className="text-blue-500 font-medium">
                            PR{String(product.id).padStart(2, "0")}
                          </TableCell>

                          {/* FOTO */}
                          <TableCell>
                            <img
                              src={
                                product.photo
                                  ? `http://127.0.0.1:8000/storage/${product.photo}`
                                  : "/placeholder.png"
                              }
                              className="w-10 h-10 rounded object-cover"
                            />
                          </TableCell>

                          {/* NAMA */}
                          <TableCell>{product.name}</TableCell>

                          {/* HARGA */}
                          <TableCell>
                            Rp {Number(product.price).toLocaleString("id-ID")}
                          </TableCell>

                          {/* KATEGORI (sementara static dulu)
                          <TableCell>Banner</TableCell> */}

                          {/* ESTIMASI */}
                          <TableCell>
                            {product.estimated_duration} Hari
                          </TableCell>

                          {/* STATUS */}
                          <TableCell>
                            <Badge
                              className={
                                product.status
                                  ? "bg-green-100 text-green-600"
                                  : "bg-red-100 text-red-500"
                              }
                            >
                              {product.status ? "Aktif" : "Tidak Aktif"}
                            </Badge>
                          </TableCell>

                          {/* AKSI */}
                          <TableCell>
                            <div className="flex justify-center gap-3">
                              
                              <Eye
                                onClick={() => {
                                  setSelectedProduct(product)
                                  setOpenDetail(true)
                                }}
                                className="w-5 h-5 cursor-pointer text-gray-400 hover:text-blue-500"
                              />

                              <Trash2
                                onClick={() => {
                                  setSelectedId(product.id)
                                  setOpenDelete(true)
                                }}
                                className="w-5 h-5 cursor-pointer text-gray-400 hover:text-red-500"
                              />
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
                        {startIndex + 1} - {Math.min(startIndex + itemsPerPage, products.length)} of {products.length} Pages
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
              <ProductCreateModal
              open={openCreate}
              onClose={() => setOpenCreate(false)}
              onSuccess={() => {
                fetchProducts()
                setCurrentPage(1)
              }}
            />
            <ProductDetailModal
              open={openDetail}
              onClose={() => setOpenDetail(false)}
              product={selectedProduct}
              onSuccess={(updated) => {
              setProducts((prev) =>
                prev.map((p) => (p.id === updated.id ? updated : p))
              )
              setSelectedProduct(updated)
            }}
            />
            <DeleteModal
              open={openDelete}
              onClose={() => setOpenDelete(false)}
              onDelete={handleDelete}
            />
            </div>
    </DashboardLayout>
  )
}