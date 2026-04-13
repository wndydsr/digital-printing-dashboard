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
  ChevronDown,
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
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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

// Sample data
const metricsData = [
  { label: "Total Pesanan", value: "{orders.length}", change: "+12%", trend: "up", icon: Workflow },
  { label: "Success Rate", value: "98.7%", change: "+0.3%", trend: "up", icon: CheckCircle },
  { label: "Avg Response", value: "38s", change: "-2.1s", trend: "up", icon: Clock },
  { label: "Active Users", value: "1,423", change: "+8.2%", trend: "up", icon: Users },
]

const workflowData = [
  {
    id: 6734,
    name: "Product Catalog Sync",
    started: "22 Jun 2025, 10:48",
    duration: "45.2s",
    status: "running",
    error: null,
  },
  {
    id: 6733,
    name: "Customer Webhook Listener",
    started: "22 Jun 2025, 10:12",
    duration: "30s",
    status: "success",
    error: null,
  },
  {
    id: 6732,
    name: "Data Enrichment Pipeline",
    started: "22 Jun 2025, 09:45",
    duration: "2m 15s",
    status: "success",
    error: null,
  },
  {
    id: 6731,
    name: "Analytics Refresh",
    started: "22 Jun 2025, 09:30",
    duration: "1m 8s",
    status: "success",
    error: null,
  },
  {
    id: 6730,
    name: "Billing Reconciliation",
    started: "22 Jun 2025, 09:15",
    duration: "3m 22s",
    status: "success",
    error: null,
  },
  {
    id: 6729,
    name: "Inventory Level Sync",
    started: "22 Jun 2025, 08:58",
    duration: "45s",
    status: "failed",
    error: "HTTP Error 404: Not Found",
  },
  {
    id: 6728,
    name: "KYC Data Update",
    started: "22 Jun 2025, 08:45",
    duration: "1m 12s",
    status: "success",
    error: null,
  },
  {
    id: 6727,
    name: "Monthly Log Archiver",
    started: "22 Jun 2025, 08:30",
    duration: "4m 33s",
    status: "success",
    error: null,
  },
]

const chartData = [
  { name: "Jan", sales: 4000, views: 2400, workflows: 240 },
  { name: "Feb", sales: 3000, views: 1398, workflows: 221 },
  { name: "Mar", sales: 2000, views: 9800, workflows: 229 },
  { name: "Apr", sales: 2780, views: 3908, workflows: 200 },
  { name: "May", sales: 1890, views: 4800, workflows: 218 },
  { name: "Jun", sales: 2390, views: 3800, workflows: 250 },
  { name: "Jul", sales: 3490, views: 4300, workflows: 210 },
]

const teamMembers = [
  {
    name: "Clara Blackwood",
    role: "Engineer",
    status: "online",
    avatar: "/placeholder.svg?height=32&width=32",
    availability: "On-call",
  },
  {
    name: "Michael Whitmore",
    role: "Owner",
    status: "online",
    avatar: "/placeholder.svg?height=32&width=32",
    availability: "Available",
  },
  {
    name: "Dennis Brightwood",
    role: "Engineer",
    status: "away",
    avatar: "/placeholder.svg?height=32&width=32",
    availability: "Available in 2hrs",
  },
  {
    name: "Sarah Chen",
    role: "Designer",
    status: "online",
    avatar: "/placeholder.svg?height=32&width=32",
    availability: "In meeting",
  },
]

const recentActivity = [
  { workflow: "Product Catalog Sync", time: "2 minutes ago", status: "success", duration: "45s" },
  { workflow: "Customer Webhook", time: "5 minutes ago", status: "success", duration: "30s" },
  { workflow: "Data Enrichment", time: "12 minutes ago", status: "success", duration: "2m 15s" },
  { workflow: "Analytics Refresh", time: "18 minutes ago", status: "success", duration: "1m 8s" },
  { workflow: "Inventory Sync", time: "32 minutes ago", status: "failed", duration: "45s" },
]

interface Order {
  id: number;
  order_code: string;    // ORD-001
  customer?: { name: string }; // 'Windy Destiana'
  order_date: string;
  total_price: number;   // 50000
  current_stage_id: number
    stage?: {
    id: number
    name: string
  }
  status_id: number;       // 'pending' atau 'completed'
  created_by: number;
  notes: string;         // 'Cetak banner'
  created_at: string;
}

export default function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("Last 30 days")
  const [orders, setOrders] = useState<Order[]>([])
  
  const menunggu = orders.filter(o => o.status_id === 1).length
  const diproses = orders.filter(o => o.status_id === 2).length
  const selesai = orders.filter(o => o.status_id === 3).length

  const statusLabel = {
  1: "Menunggu",
  2: "Proses",
  3: "Selesai",
}
  const statusColor = {
  1: "bg-yellow-100 text-yellow-600",
  2: "bg-blue-100 text-blue-600",
  3: "bg-green-100 text-green-600",
}

 const pieData = [
  { name: "Menunggu", value: menunggu },
  { name: "Diproses", value: diproses },
  { name: "Selesai", value: selesai },
]

  const metricsData = [
    { 
      label: "Total Pesanan", 
      value: orders.length.toString(), // Benar: Mengambil jumlah data asli 
      trend: "up", 
      icon: Workflow 
    },
    { 
    label: "Pesanan Diproses", 
    value: diproses.toString(), 
    change: "Menunggu", 
    trend: "down", 
    icon: Clock 
  },
  { 
    label: "Pesanan Menunggu", 
    value: menunggu.toString(),
    trend: "down", 
    icon: Clock 
  },
  { 
    label: "Pesanan Selesai", 
    value: selesai.toString(), 
    change: "Berhasil", 
    trend: "up", 
    icon: CheckCircle 
  },
  ]

useEffect(() => {
  fetch("http://127.0.0.1:8000/api/orders")
    .then((res) => res.json())
    .then((data) => {
      console.log(data)
      setOrders(data)
    })
}, [])

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <Workflow className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900">Winlah</span>
          </div>
          <div className="text-sm text-gray-500">
            <span>Dashboard</span> <span className="mx-1">/</span> <span>Overview</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search workflows, logs..."
              className="pl-10 w-80 bg-gray-50 border-gray-200 focus:bg-white"
            />
          </div>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Avatar className="w-8 h-8">
                  <AvatarImage src="/placeholder.svg?height=32&width=32" />
                  <AvatarFallback>AE</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>winlah</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-60 border-r border-gray-200 bg-white h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="p-4">
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input placeholder="Search anything..." className="pl-10 bg-gray-50 border-gray-200 text-sm" />
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 w-6 h-6"
              >
                <ArrowRight className="w-3 h-3" />
              </Button>
            </div>

            <nav className="space-y-1">
              <Link
                href="/"
                className="flex items-center w-full justify-start bg-purple-50 text-purple-700 hover:bg-purple-100 px-3 py-2 rounded-md text-sm font-medium"
              >
                <Home className="w-4 h-4 mr-3" />
                Overview
              </Link>
              <Link
                href="/workflows"
                className="flex items-center w-full justify-start text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-md text-sm font-medium"
              >
                <Workflow className="w-4 h-4 mr-3" />
                Workflows
              </Link>
              <Link
                href="/analytics"
                className="flex items-center w-full justify-start text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-md text-sm font-medium"
              >
                <BarChart3 className="w-4 h-4 mr-3" />
                Analytics
              </Link>
              <Link
                href="/templates"
                className="flex items-center w-full justify-start text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-md text-sm font-medium"
              >
                <Database className="w-4 h-4 mr-3" />
                Templates
              </Link>
              <Link
                href="/team"
                className="flex items-center w-full justify-start text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-md text-sm font-medium"
              >
                <Users className="w-4 h-4 mr-3" />
                Team
              </Link>
              <Link
                href="/settings"
                className="flex items-center w-full justify-start text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-md text-sm font-medium"
              >
                <Settings className="w-4 h-4 mr-3" />
                Settings
              </Link>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 bg-gray-50">
          {/* Quick Actions Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Dashboard Overview</h1>
                <p className="text-gray-600 mt-1">Monitor your workflows and system performance</p>
              </div>
              <div className="flex items-center gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2 bg-transparent">
                      {selectedPeriod} <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setSelectedPeriod("Last 7 days")}>Last 7 days</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedPeriod("Last 30 days")}>Last 30 days</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedPeriod("Last 90 days")}>Last 90 days</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New Workflow
                </Button>
              </div>
            </div>

            {/* Quick Action Cards */}
            {/* <div className="grid grid-cols-3 gap-4 mb-8">
              <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Plus className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">New workflow</h3>
                    <p className="text-sm text-gray-600">Create a new automation</p>
                  </div>
                </div>
              </Card> */}
{/* 
              <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">View breaches</h3>
                    <p className="text-sm text-gray-600">Check failed workflows</p>
                  </div>
                </div>
              </Card> */}

              {/* <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Re-run last failed</h3>
                    <p className="text-sm text-gray-600">Retry failed executions</p>
                  </div>
                </div>
              </Card>
            </div> */}
          </div>

          {/* Metrics Overview */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            {metricsData.map((metric, index) => (
              <Card key={index} className="bp-6 hover:shadow-md transition-shadow cursor-pointer border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <metric.icon className="w-5 h-5 text-gray-600" />
                    </div>
                    <div
                      className={`flex items-center gap-1 text-sm ${metric.trend === "up" ? "text-green-600" : "text-red-600"}`}
                    >
                      {metric.trend === "up" ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {metric.change}
                    </div>
                  </div>
                  <div className="text-2xl font-semibold text-gray-900 mb-1">{metric.value}</div>
                  <div className="text-sm text-gray-600">{metric.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-8">
            {/* Main Content Area */}
            <div className="col-span-2 space-y-8">
              {/* Charts Section */}
              <Card className="border-gray-200">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold">Performance Analytics</CardTitle>
                      <CardDescription>Workflow execution trends and system metrics</CardDescription>
                    </div>
                    <Tabs defaultValue="workflows" className="w-auto">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="workflows">Workflows</TabsTrigger>
                        <TabsTrigger value="sales">Sales</TabsTrigger>
                        <TabsTrigger value="views">Views</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                        <YAxis stroke="#6b7280" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="workflows"
                          stroke="#8b5cf6"
                          fill="#8b5cf6"
                          fillOpacity={0.1}
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="sales"
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          fillOpacity={0.1}
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>             
            </div>            
                      
            {/* Right Sidebar */}
            <div className="space-y-6"> 
              {/* Recent Activity */}
              <Card className="border-gray-200">
  <CardHeader className="pb-4">
    <CardTitle className="text-lg font-semibold">
      Distribusi Pesanan
    </CardTitle>
  </CardHeader>

        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>

                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  <Cell fill="#facc15" /> {/* Pending */}
                  <Cell fill="#22c55e" /> {/* Completed */}
                  <Cell fill="#ef4444" /> {/* Cancelled */}
                </Pie>

                <Tooltip />
                <Legend />

              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
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
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Filter className="w-4 h-4 mr-2" />
                        Filter
                      </Button>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        View All
                      </Button>
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
                      {orders.map((order) => (
                        <TableRow key={order.id} className="hover:bg-gray-50/80 transition-colors border-b border-gray-100">
                          {/* No Pesanan dengan warna biru khas link */}
                          <TableCell className="text-blue-500 font-medium">{order.order_code}</TableCell>
                          
                          {/* Pelanggan & Produk */}
                          <TableCell className="text-gray-700">{order.customer?.name}</TableCell> {/* Nanti bisa ambil dari order.customer.name */}
                          <TableCell className="text-gray-700">{order.notes}</TableCell>
                          
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
                              ${order.status_id === 1 ? 'text-red-500 border-red-200 bg-red-50/30' : ''}
                              ${order.status_id === 2 ? 'text-yellow-500 border-yellow-200 bg-yellow-50/30' : ''}
                              ${order.status_id === 3 ? 'text-green-500 border-green-200 bg-green-50/30' : ''}
                            `}>
                              {order.stage?.name || '-'}
                            </Badge>
                          </TableCell>

                          {/* Status (Badge Solid Soft) */}
                          <TableCell>
                            <Badge className={`
                              rounded-md px-4 py-1 border-none font-medium shadow-none
                              ${order.status_id === 1
                                  ? 'bg-yellow-100 text-yellow-600'
                                  : order.status_id === 2
                                  ? 'bg-blue-100 text-blue-600'
                                  : 'bg-green-100 text-green-600'}
                              `}>
                              {order.status_id === 1 ? 'Menunggu' : order.status_id === 2 ? 'Diproses' : 'Selesai'}
                            </Badge>
                          </TableCell>

                          {/* Ikon Aksi (Eye & Trash) */}
                          <TableCell>
                            <div className="flex items-center justify-center gap-3">
                              <button className="text-gray-400 hover:text-gray-600 transition-colors">
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
                </CardContent>
              </Card>
        </main>
      </div>
    </div>
  )
}
