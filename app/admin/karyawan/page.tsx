"use client"

import { useEffect, useState } from "react"
import { Eye, Trash2, Plus, Download, Filter } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import KaryawanCreateModal from "@/components/ui/create-karyawan"
import KaryawanDetailModal from "@/components/ui/karyawan-detail"
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

interface Karyawan {
  id: number
  name: string
  email: string
  role: string
  created_at: string
  updated_at: string
}

export default function KaryawanPage() {
  const [karyawanList, setKaryawanList] = useState<Karyawan[]>([])
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [openCreate, setOpenCreate] = useState(false)
  const [selectedKaryawan, setSelectedKaryawan] = useState<Karyawan | null>(null)
  const [openDetail, setOpenDetail] = useState(false)
  const [openDelete, setOpenDelete] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const itemsPerPage = 10

  const fetchKaryawan = async () => {
    try {
      const data = await apiFetch("/karyawan")
      // Memastikan data yang di-set adalah array
      const rawData = Array.isArray(data) ? data : data.data || []
      setKaryawanList(rawData)
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async () => {
    if (!selectedId) return

    try {
      await apiFetch(`/karyawan/${selectedId}`, {
        method: "DELETE",
      })

      fetchKaryawan()
      setOpenDelete(false)
      setSelectedId(null)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchKaryawan()
  }, [])

  // FILTER SEARCH (Aman dari property name yang null/undefined)
  const filtered = karyawanList.filter(k =>
    k.name?.toLowerCase().includes(search.toLowerCase()) ||
    k.role?.toLowerCase().includes(search.toLowerCase())
  )

  // PAGINATION
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentData = filtered.slice(startIndex, startIndex + itemsPerPage)
  const totalPages = Math.ceil(filtered.length / itemsPerPage)

  // Fungsi Helper untuk styling Badge berdasarkan Role
  const getRoleBadgeClass = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'desainer':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'operator':
        return 'bg-amber-100 text-amber-700 border-amber-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  // Fungsi Helper untuk format Tanggal Bergabung dari created_at
  const formatTanggal = (dateString: string) => {
    if (!dateString) return "-"
    try {
      // Mengganti spasi dengan 'T' jika format dari DB menggunakan format YYYY-MM-DD HH:mm:ss
      const formattedString = dateString.replace(" ", "T")
      const date = new Date(formattedString)
      
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    } catch (e) {
      return dateString
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Karyawan</h1>

          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" /> Filter
            </Button>

            <Button variant="outline" className="gap-2">
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
          placeholder="Cari nama atau role karyawan..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setCurrentPage(1) // Reset ke halaman 1 saat mengetik pencarian
          }}
          className="max-w-sm"
        />

        {/* TABLE */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-16">No</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role / Peran</TableHead>
                  <TableHead>Tanggal Bergabung</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {currentData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Tidak ada data karyawan ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  currentData.map((k, i) => (
                    <TableRow key={k.id}>
                      <TableCell>{startIndex + i + 1}</TableCell>
                      <TableCell className="font-medium">{k.name}</TableCell>
                      <TableCell>{k.email}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 border rounded text-xs font-semibold uppercase ${getRoleBadgeClass(k.role)}`}>
                          {k.role || "Tidak Ada"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {formatTanggal(k.created_at)}
                      </TableCell>

                      <TableCell>
                        <div className="flex justify-center gap-3">
                          <button
                            onClick={() => {
                              setSelectedKaryawan(k)
                              setOpenDetail(true)
                            }}
                            className="text-gray-400 hover:text-gray-700 transition-colors"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedId(k.id)
                              setOpenDelete(true)
                            }}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            
            {/* PAGINATION */}
            <div className="flex items-center justify-between w-full px-4 py-3 border-t bg-gray-50">
              <span className="text-sm text-gray-500">
                {filtered.length > 0 ? startIndex + 1 : 0} - {Math.min(startIndex + itemsPerPage, filtered.length)} dari {filtered.length} Data
              </span>          
              <Pagination className="mx-0 w-auto justify-end"> 
                <PaginationContent>

                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }}
                    />
                  </PaginationItem>

                  {Array.from({ length: totalPages }, (_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        href="#"
                        isActive={currentPage === i + 1}
                        onClick={(e) => {
                          e.preventDefault()
                          setCurrentPage(i + 1)
                        }}
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }}
                    />
                  </PaginationItem>

                </PaginationContent>
              </Pagination>
            </div>
          </CardContent>
        </Card>

        {/* MODALS */}
        <KaryawanCreateModal
          open={openCreate}
          onClose={() => setOpenCreate(false)}
          onSuccess={fetchKaryawan}
        />

        <KaryawanDetailModal
          open={openDetail}
          onClose={() => setOpenDetail(false)}
          karyawan={selectedKaryawan}
          onSuccess={fetchKaryawan}
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