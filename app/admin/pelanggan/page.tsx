"use client"

import { useEffect, useState } from "react"
import { Eye, Trash2, Plus, Download } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import CustomerCreateModal from "@/components/ui/customer-create"
import CustomerDetailModal from "@/components/ui/customer-detail"
import DeleteModal from "@/components/ui/DeleteModal"
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from "@/components/ui/table"
import {
  Pagination, PaginationContent, PaginationItem,
  PaginationLink, PaginationNext, PaginationPrevious
} from "@/components/ui/pagination"
import { apiFetch } from "@/lib/api"
import { toast } from "sonner"

interface Customer {
  id: number
  name: string
  phone: string
  email: string
  address: string
}

export default function CustomerPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [openCreate, setOpenCreate] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [openDetail, setOpenDetail] = useState(false)

  const itemsPerPage = 10

  const fetchCustomers = async () => {
    try {
      const data = await apiFetch("/customers")
      setCustomers(Array.isArray(data) ? data : data.data || [])
    } catch (err) {
      console.error(err)
      toast.error("Gagal memuat data pelanggan.")
    }
  }
      
  const [openDelete, setOpenDelete] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const handleDelete = async () => {
    if (!selectedId) return

    try {
      await apiFetch(`/customers/${selectedId}`, {
        method: "DELETE",
      })

      fetchCustomers()
      setOpenDelete(false)
      setSelectedId(null)
      toast.success("Data pelanggan berhasil dihapus!")
    } catch (err) {
      console.error(err)
      toast.error("Gagal menghapus data pelanggan.")
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  // FILTER SEARCH
  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  )

  // PAGINATION
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentData = filtered.slice(startIndex, startIndex + itemsPerPage)
  const totalPages = Math.ceil(filtered.length / itemsPerPage)

  // 🛠️ FUNGSI EXCEL DATA EXPORTER (NATIVE CLIENT METHOD)
  const handleExportCustomers = () => {
    if (customers.length === 0) {
      toast.error("Tidak ada data pelanggan untuk di-export.")
      return
    }

    // 1. Definisikan header kolom Excel
    const headers = ["ID Pelanggan", "Nama Lengkap", "No Telepon", "Email", "Alamat Tinggal"]

    // 2. Format baris data (menggunakan data dari variabel filtered agar sinkron dengan kolom pencarian)
    const csvRows = filtered.map((c) => {
      return [
        c.id,
        `"${c.name || "-"}"`,
        `"${c.phone || "-"}"`,
        `"${c.email || "-"}"`,
        `"${c.address || "-"}"`
      ].join(",")
    })

    // 3. Gabungkan struktur baris dengan pembatas baris baru
    const csvContent = [headers.join(","), ...csvRows].join("\n")

    // 4. Bungkus dengan BOM UTF-8 (\uFEFF) agar terbaca rapi oleh Microsoft Excel & Sheets
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)

    // 5. Eksekusi pengunduhan file otomatis dari browser client
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `Data_Pelanggan_Prinora_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success("Data pelanggan berhasil di-export ke CSV!")
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Pelanggan</h1>

          <div className="flex gap-2">
            <Button onClick={handleExportCustomers} variant="outline" className="gap-2">
              <Download className="w-4 h-4" /> Export
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

        {/* TABLE */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>No</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>No Telepon</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Alamat</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {currentData.map((c, i) => (
                  <TableRow key={c.id}>
                    <TableCell>{startIndex + i + 1}</TableCell>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{c.phone}</TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>{c.address}</TableCell>

                    <TableCell>
                      <div className="flex justify-center gap-3">
                        <button
                          onClick={() => {
                            setSelectedCustomer(c)
                            setOpenDetail(true)
                          }}
                          className="text-gray-400 hover:text-gray-700"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button onClick={() => {
                                   setSelectedId(c.id)
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
            {/* PAGINATION DI DALAM CARD */}
                <div className="flex items-center justify-between w-full px-4 py-3 border-t bg-gray-50">
                  
                  {/* INFO */}
                  <span className="text-sm text-gray-500">
                    {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filtered.length)} of {filtered.length} items
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
        <CustomerCreateModal
          open={openCreate}
          onClose={() => setOpenCreate(false)}
          onSuccess={fetchCustomers}
        />

        <CustomerDetailModal
          open={openDetail}
          onClose={() => setOpenDetail(false)}
          customer={selectedCustomer}
          onSuccess={fetchCustomers}
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