"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Search, Bell, History, Layers, ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { apiFetch } from "@/lib/api"

const navigation = [
  { name: "Dashboard", href: "/desainer", icon: Home },
  { name: "Antrian", href: "/desainer/antrian", icon: Layers },
  { name: "Riwayat", href: "/desainer/riwayat", icon: History },
]

interface UserProfile {
  name: string;
  email: string;
}

export function DesainerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: "Loading...",
    email: "",
  })

  useEffect(() => {
    // 🛠️ Sinkronisasi Awal: Coba intip localStorage dulu biar instan langsung muncul namanya
    const storedName = localStorage.getItem("user_name")
    const storedEmail = localStorage.getItem("user_email")
    if (storedName) {
      setUserProfile({ name: storedName, email: storedEmail || "" })
    }

    // Ambil data terbaru dari backend API
    apiFetch("/me")
      .then((data: any) => {
        if (data && data.name) {
          setUserProfile({ name: data.name, email: data.email })
          // Sinkronkan ke local storage
          localStorage.setItem("user_name", data.name)
          localStorage.setItem("user_email", data.email)
        }
      })
      .catch((err) => {
        console.error("Gagal memuat profil desainer:", err)
        if (!storedName) {
          setUserProfile({ name: "Desainer Panel", email: "" })
        }
      })

    // 🛠️ Fungsi sakti: Jika di halaman profile datanya di-save, komponen header ini langsung mendeteksi perubahannya secara real-time
    const handleStorageChange = () => {
      setUserProfile({
        name: localStorage.getItem("user_name") || "Desainer Panel",
        email: localStorage.getItem("user_email") || "",
      })
    }

    window.addEventListener("storage_profile_updated", handleStorageChange)
    return () => window.removeEventListener("storage_profile_updated", handleStorageChange)
  }, [pathname]) // Dipicu ulang setiap pindah halaman agar datanya selalu segar

  const getInitials = (name: string) => {
    return name && name !== "Loading..." ? name.substring(0, 2).toUpperCase() : "DS"
  }

  const handleLogout = async () => {
    try {
      await apiFetch("/logout", { method: "POST" })
      localStorage.clear()
      window.location.href = "/login"
    } catch (err) {
      console.error(err)
      localStorage.clear()
      window.location.href = "/login"
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between">
        <div className="flex items-start gap-4">
          <div className="font-semibold text-gray-900">
            Prinora Store
          </div>
          <div className="text-sm text-gray-500">
            <span>Desainer</span>
            <span className="mx-1">/</span>
            <span className="capitalize">
              {pathname === "/desainer" ? "Dashboard" : pathname.split("/").pop()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
        
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
          </Button>

          {/* Dropdown Menu Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-gray-50 h-10 rounded-md">
                <Avatar className="w-8 h-8">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-purple-100 text-purple-700 font-bold">{getInitials(userProfile.name)}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-gray-700 hidden sm:inline-block">
                  {userProfile.name}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:inline-block" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-gray-900">{userProfile.name}</p>
                  <p className="text-xs leading-none text-gray-500">{userProfile.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {/* 🛠️ SAMBUNGKAN LINK PROFILE KE HALAMAN PROFILE KAMU */}
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/desainer/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 cursor-pointer">
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-60 border-r border-gray-200 bg-white h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="p-4">
            <nav className="space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-purple-50 text-purple-700"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <item.icon className="w-4 h-4 mr-3" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 p-8 bg-gray-50 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  )
}