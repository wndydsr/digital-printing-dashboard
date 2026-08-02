"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { 
  ArrowLeft, 
  Save, 
  Store, 
  ToggleLeft, 
  ToggleRight, 
  CreditCard 
} from "lucide-react"
import { toast } from "sonner"

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // State parameter yang beneran penting & simpel ajah
  const [settings, setSettings] = useState({
    storeName: "Prinora Store",
    storeAddress: "Jl. Prof. Sudarto, Tembalang, Semarang",
    whatsappCS: "08985636138",
    isOpen: true, // Status Toko Buka/Tutup
    gatewayFee: "2500" // Biaya admin payment gateway
  })

  // Load dari localStorage biar tetep interaktif pas demo
  useEffect(() => {
    const localName = localStorage.getItem("set_store_name")
    const localAddress = localStorage.getItem("set_store_address")
    const localWA = localStorage.getItem("set_store_wa")
    const localIsOpen = localStorage.getItem("set_store_status")
    const localFee = localStorage.getItem("set_store_fee")

    if (localName || localAddress || localWA || localIsOpen || localFee) {
      setSettings({
        storeName: localName || "Prinora Store",
        storeAddress: localAddress || "Jl. Prof. Sudarto, Tembalang, Semarang",
        whatsappCS: localWA || "08985636138",
        isOpen: localIsOpen ? localIsOpen === "true" : true,
        gatewayFee: localFee || "2500"
      })
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setSettings((prev) => ({ ...prev, [name]: value }))
  }

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    setTimeout(() => {
      localStorage.setItem("set_store_name", settings.storeName)
      localStorage.setItem("set_store_address", settings.storeAddress)
      localStorage.setItem("set_store_wa", settings.whatsappCS)
      localStorage.setItem("set_store_status", String(settings.isOpen))
      localStorage.setItem("set_store_fee", settings.gatewayFee)

      setLoading(false)
      toast.success("Konfigurasi informasi toko Prinora berhasil diperbarui.")
    }, 500)
  }

  return (
    <DashboardLayout>
      <div className="w-full space-y-8">
        
        {/* Header Title & Tombol Back */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-100 pb-5">
          <div className="flex items-start gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="mt-1 h-9 w-9 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 shadow-sm flex-shrink-0"
              title="Kembali"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">Pengaturan Website</h1>
              <p className="text-sm text-gray-500 mt-1">Kelola informasi dasar toko dan status operasional Prinora.</p>
            </div>
          </div>
          
          <Button 
            form="settings-form"
            type="submit"
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 gap-2 self-start md:self-auto shadow-sm px-5"
          >
            <Save className="w-4 h-4" /> {loading ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </div>

        {/* Layout Grid Form 2 Kolom (Lebih rapi dan bersih) */}
        <form id="settings-form" onSubmit={handleSaveSettings}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            
            {/* 1. Profil Toko / Workshop */}
            <Card className="border-gray-200/80 shadow-sm bg-white h-full flex flex-col">
              <CardHeader className="pb-4 border-b border-gray-50">
                <div className="flex items-center gap-2 text-purple-600 mb-1">
                  <Store className="w-4 h-4" />
                  <CardTitle className="text-md font-semibold text-gray-900 m-0">Profil Toko & Kontak</CardTitle>
                </div>
                <CardDescription>Informasi dasar yang akan muncul di website pelanggan.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-5 flex-1">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Nama Toko</label>
                  <Input name="storeName" value={settings.storeName} onChange={handleChange} className="bg-gray-50/50 border-gray-200" required />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Nomor WhatsApp CS</label>
                  <Input name="whatsappCS" value={settings.whatsappCS} onChange={handleChange} className="bg-gray-50/50 border-gray-200" required />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Alamat Workshop</label>
                  <Input name="storeAddress" value={settings.storeAddress} onChange={handleChange} className="bg-gray-50/50 border-gray-200" required />
                </div>
              </CardContent>
            </Card>

            {/* 2. Status Operasional & Biaya Transaksi */}
            <Card className="border-gray-200/80 shadow-sm bg-white h-full flex flex-col">
              <CardHeader className="pb-4 border-b border-gray-50">
                <div className="flex items-center gap-2 text-purple-600 mb-1">
                  <CreditCard className="w-4 h-4" />
                  <CardTitle className="text-md font-semibold text-gray-900 m-0">Status Sistem & Biaya</CardTitle>
                </div>
                <CardDescription>Pengaturan transaksi dan status aktif sistem.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6 flex-1 flex flex-col justify-between">
                
                {/* Biaya Admin */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Biaya Admin Pembayaran (Payment Gateway)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">Rp</span>
                    <Input type="number" name="gatewayFee" value={settings.gatewayFee} onChange={handleChange} className="bg-gray-50/50 border-gray-200 pl-9" required />
                  </div>
                  <p className="text-[11px] text-gray-400 leading-normal">Kalkulasi biaya admin tambahan untuk pelanggan saat checkout otomatis.</p>
                </div>

                {/* Status Buka Tutup via Tombol Interaktif */}
                <div className="pt-4 border-t border-gray-100 flex items-center justify-between mt-auto">
                  <div>
                    <label className="text-sm font-semibold text-gray-900 block">Status Operasional Toko</label>
                    <span className="text-xs text-gray-500">Matikan jika website sedang tidak menerima pesanan.</span>
                  </div>
                  <Button
                    type="button"
                    variant={settings.isOpen ? "default" : "destructive"}
                    onClick={() => setSettings(prev => ({ ...prev, isOpen: !prev.isOpen }))}
                    className="gap-2 transition-colors"
                  >
                    {settings.isOpen ? (
                      <>
                        <ToggleRight className="w-5 h-5" /> Toko Buka
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-5 h-5" /> Toko Tutup
                      </>
                    )}
                  </Button>
                </div>

              </CardContent>
            </Card>

          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}