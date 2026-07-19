"use client"

import { useEffect, useState } from "react"
import type React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Home, History, Layers, Search, Bell, User, LogOut } from "lucide-react"
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

const navigation = [
  { name: "Dashboard", href: "/operator", icon: Home },
  { name: "Antrian", href: "/operator/antrian", icon: Layers },
  { name: "Riwayat", href: "/operator/riwayat", icon: History },
]

export function OperatorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  // 🔥 State untuk menampung data user dari localStorage agar aman dari Hydration Mismatch
  const [userData, setUserData] = useState({
    name: "Operator",
    email: "operator@prinora.store",
  })

  useEffect(() => {
    // Jalankan pengambilan localStorage dengan aman di dalam client-side browser
    const storedName = localStorage.getItem("user_name")
    const storedEmail = localStorage.getItem("user_email")
    
    if (storedName || storedEmail) {
      setUserData({
        name: storedName || "Operator",
        email: storedEmail || "operator@prinora.store",
      })
    }
  }, [])

  // Fungsi penanganan log out sistem
  const handleLogout = () => {
    localStorage.clear()
    window.location.href = "/login"
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="font-semibold text-gray-900">Operator Panel</div>
          <div className="text-sm text-gray-500">
            <span>Operator</span>
            <span className="mx-1">/</span>
            <span className="capitalize">
              {pathname === "/operator" ? "Dashboard" : pathname.split("/").pop()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search..." className="pl-10 w-72 bg-gray-50 border-gray-200" />
          </div>

          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
          </Button>

          {/* ─── DROPDOWN PROFIL & LOGOUT SINKRON ─── */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="w-8 h-8">
                  <AvatarImage src="/placeholder.svg" />
                  <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold text-xs uppercase">
                    {userData.name.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col space-y-0.5 font-normal">
                <span className="text-sm font-semibold text-gray-900 truncate">{userData.name}</span>
                <span className="text-xs text-gray-500 truncate">{userData.email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/operator/profile")} className="cursor-pointer flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" /> Profile Saya
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleLogout} 
                className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Logout
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
                        ? "bg-blue-50 text-blue-700" // 🔥 Diubah ke tema biru biar serasi dengan dashboard operator
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
        <main className="flex-1 p-8 bg-gray-50">{children}</main>
      </div>
    </div>
  )
}