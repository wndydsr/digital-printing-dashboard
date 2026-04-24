"use client"

import { useEffect, useState } from "react"
import { Eye, Trash2, Plus, Download, Filter } from "lucide-react"
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

  const fetchCustomers = () => {
    fetch("http://127.0.0.1:8000/api/customers")
      .then(res => res.json())
      .then(data => setCustomers(data))
      .catch(err => console.error(err))

     }

  const [openDelete, setOpenDelete] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const handleDelete = async () => {
    if (!selectedId) return

    try {
      await fetch(`http://127.0.0.1:8000/api/customers/${selectedId}`, {
        method: "DELETE",
      })

      console.log("Data kehapus")

      // refresh data
      fetchCustomers()

      // reset
      setOpenDelete(false)
      setSelectedId(null)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  // FILTER SEARCH
  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )


  // PAGINATION
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentData = filtered.slice(startIndex, startIndex + itemsPerPage)
  const totalPages = Math.ceil(filtered.length / itemsPerPage)

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Pelanggan</h1>

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
                                  setSelectedId(customers.find((cust) => cust.id === c.id)?.id || null)
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
                        {startIndex + 1} - {Math.min(startIndex + itemsPerPage, customers.length)} of {customers.length} Pages
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