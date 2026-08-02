"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { User, Mail, Shield, UserCheck, Edit3, X, Save, ArrowLeft } from "lucide-react"
import { apiFetch } from "@/lib/api"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default function ProfilePage() {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState("-")

  const [formData, setFormData] = useState({
    name: "Admin",
    email: "admin@prinora.store",
  })

  const [backupData, setBackupData] = useState({ ...formData })

  useEffect(() => {
    const storedName = localStorage.getItem("user_name")
    const storedEmail = localStorage.getItem("user_email")
    const storedRole = localStorage.getItem("role")

    const initialData = {
      name: storedName || "Admin",
      email: storedEmail || "admin@prinora.store",
    }

    setFormData(initialData)
    setBackupData(initialData)
    if (storedRole) setRole(storedRole)
  }, [])

  const getInitials = (name: string) => {
    const parts = name.split(" ")
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCancel = () => {
    setFormData({ ...backupData })
    setIsEditing(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await apiFetch("/customer/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formData.name, email: formData.email }),
      })
      localStorage.setItem("user_name", formData.name)
      localStorage.setItem("user_email", formData.email)
      setBackupData({ ...formData })
      setIsEditing(false)
      toast.success("Informasi akun Anda berhasil disimpan.")
    } catch (err) {
      console.error(err)
      toast.error("Terjadi kesalahan sistem saat memperbarui profil.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="w-full space-y-8">
        
        {/* ─── HEADER TITLE DENGAN TOMBOL BACK ─── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-100 pb-5">
          <div className="flex items-start gap-3">
            {/* Tombol Back Lingkar Transparan */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()} // 🔥 Mengembalikan ke halaman sebelumnya secara dinamis
              className="mt-1 h-9 w-9 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 shadow-sm flex-shrink-0"
              title="Kembali ke halaman sebelumnya"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">Profil Pengguna</h1>
              <p className="text-sm text-gray-500 mt-1">Kelola dan perbarui kredensial data personal akun Prinora Anda.</p>
            </div>
          </div>
          
          {!isEditing && (
            <Button 
              onClick={() => setIsEditing(true)} 
              className="bg-purple-600 hover:bg-purple-700 gap-2 self-start md:self-auto shadow-sm"
            >
              <Edit3 className="w-4 h-4" /> Edit Profil
            </Button>
          )}
        </div>

        {/* Grid Layout (Tetap Full-Width sesuai request sebelumnya) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-stretch">
          {/* Kiri: Ringkasan Kartu Avatar */}
          <Card className="border-gray-200/80 shadow-sm bg-white overflow-hidden h-full flex flex-col">
            <div className="h-24 bg-gradient-to-r from-purple-600 to-indigo-600" />
            <CardContent className="pt-0 text-center flex flex-col items-center flex-1 pb-6">
              <Avatar className="w-24 h-24 border-4 border-white rounded-full -mt-12 shadow-md bg-white">
                <AvatarFallback className="text-xl font-bold bg-purple-100 text-purple-700">
                  {getInitials(formData.name)}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-lg font-bold text-gray-900 mt-3">{formData.name}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{formData.email}</p>
              
              <div className="mt-5 w-full pt-4 border-t border-gray-100 flex items-center justify-center gap-2 mt-auto">
                <Shield className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-semibold text-purple-700 uppercase bg-purple-50 px-2.5 py-1 rounded-md border border-purple-100 tracking-wider">
                  {role}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Kanan: Form Detail & Aksi */}
          <Card className="lg:col-span-3 border-gray-200/80 shadow-sm bg-white h-full flex flex-col">
            <CardHeader className="pb-4 border-b border-gray-50">
              <CardTitle className="text-md font-semibold text-gray-900">Detail Informasi Akun</CardTitle>
              <CardDescription>Ubah detail identitas atau sesuaikan alamat surat elektronik aktif Anda.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1 flex flex-col">
              <form onSubmit={handleSave} className="space-y-5 flex-1 flex flex-col justify-between">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-gray-400" /> Nama Lengkap
                    </label>
                    <Input name="name" value={formData.name} onChange={handleChange} disabled={!isEditing || loading} className={`bg-gray-50/50 border-gray-200 focus:bg-white focus:ring-purple-500 transition-colors ${isEditing ? "border-purple-300 bg-white" : ""}`} placeholder="Masukkan nama lengkap" required />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-gray-400" /> Alamat Email
                    </label>
                    <Input type="email" name="email" value={formData.email} onChange={handleChange} disabled={!isEditing || loading} className={`bg-gray-50/50 border-gray-200 focus:bg-white focus:ring-purple-500 transition-colors ${isEditing ? "border-purple-300 bg-white" : ""}`} placeholder="nama@perusahaan.com" required />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2">
                      <UserCheck className="w-3.5 h-3.5 text-gray-300" /> Hak Akses / Otoritas
                    </label>
                    <Input value={role} disabled className="bg-gray-100 border-gray-200 text-gray-400 font-medium capitalize select-none cursor-not-allowed" />
                  </div>
                </div>

                {isEditing && (
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-50 mt-auto">
                    <Button type="button" variant="ghost" onClick={handleCancel} disabled={loading} className="gap-2 text-gray-600 hover:bg-gray-100">
                      <X className="w-4 h-4" /> Batal
                    </Button>
                    <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white gap-2 px-5 shadow-sm shadow-purple-200">
                      <Save className="w-4 h-4" /> {loading ? "Menyimpan..." : "Simpan Perubahan"}
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </div>

      </div>
    </DashboardLayout>
  )
}