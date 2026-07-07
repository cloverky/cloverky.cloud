"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  LayoutDashboard,
  BarChart2,
  DollarSign,
  Users,
  Package,
  FileText,
  Settings,
  Menu,
  X,
  Bell,
  Search,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Refrigerator,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const revenueData = [
  { month: "Jan", revenue: 4200, target: 4000 },
  { month: "Feb", revenue: 5800, target: 5000 },
  { month: "Mar", revenue: 5200, target: 5500 },
  { month: "Apr", revenue: 7100, target: 6000 },
  { month: "May", revenue: 6500, target: 6500 },
  { month: "Jun", revenue: 8400, target: 7000 },
  { month: "Jul", revenue: 7800, target: 7500 },
  { month: "Aug", revenue: 9200, target: 8000 },
  { month: "Sep", revenue: 8600, target: 8500 },
  { month: "Oct", revenue: 10100, target: 9000 },
  { month: "Nov", revenue: 9400, target: 9500 },
  { month: "Dec", revenue: 11200, target: 10000 },
];

const trafficData = [
  { name: "Organic", value: 38, color: "#10b981" },
  { name: "Referral", value: 27, color: "#6366f1" },
  { name: "Direct", value: 21, color: "#f59e0b" },
  { name: "기타", value: 14, color: "#94a3b8" },
];

const salesData = [
  { category: "채소", q1: 3200, q2: 2800, q3: 4100, q4: 3600 },
  { category: "육류", q1: 2100, q2: 2600, q3: 1900, q4: 3100 },
  { category: "유제품", q1: 1800, q2: 2200, q3: 2400, q4: 2700 },
  { category: "해산물", q1: 1200, q2: 1500, q3: 1800, q4: 2100 },
  { category: "간식", q1: 900, q2: 1100, q3: 1300, q4: 1600 },
];

const recentOrders = [
  { id: "#ORD-8821", customer: "김민준", status: "결제완료", amount: "₩294", statusColor: "text-emerald-500 bg-emerald-500/10" },
  { id: "#ORD-8820", customer: "이서연", status: "처리중", amount: "₩1,120", statusColor: "text-amber-500 bg-amber-500/10" },
  { id: "#ORD-8819", customer: "박지호", status: "배송중", amount: "₩88", statusColor: "text-blue-500 bg-blue-500/10" },
  { id: "#ORD-8818", customer: "최유나", status: "결제완료", amount: "₩340", statusColor: "text-emerald-500 bg-emerald-500/10" },
  { id: "#ORD-8817", customer: "정도현", status: "취소됨", amount: "₩212", statusColor: "text-red-500 bg-red-500/10" },
  { id: "#ORD-8816", customer: "강하늘", status: "결제완료", amount: "₩88", statusColor: "text-emerald-500 bg-emerald-500/10" },
];

const topProducts = [
  { name: "신선 채소 세트", revenue: "₩21k", bar: 85 },
  { name: "무선 스마트 냉장고 센서", revenue: "₩17k", bar: 68 },
  { name: "스포츠 영양식 패키지", revenue: "₩14k", bar: 54 },
  { name: "데스크 냉장고 Pro", revenue: "₩12k", bar: 46, highlight: true },
  { name: "Studio Mix Z", revenue: "₩9k", bar: 35 },
];

// ─── Sidebar Nav Items ────────────────────────────────────────────────────────

const navItems = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Analytics", icon: BarChart2 },
  { label: "Revenue", icon: DollarSign },
  { label: "Customers", icon: Users },
  { label: "Products", icon: Package },
  { label: "Reports", icon: FileText },
  { label: "Settings", icon: Settings },
];

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  change,
  up,
  dark,
}: {
  title: string;
  value: string;
  change: string;
  up: boolean;
  dark?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl p-4 sm:p-5",
        dark
          ? "bg-zinc-900 text-white dark:bg-zinc-800"
          : "border border-border bg-card",
      )}
    >
      <p className={cn("text-xs font-semibold uppercase tracking-widest", dark ? "text-zinc-400" : "text-muted-foreground")}>
        {title}
      </p>
      <p className={cn("mt-2 text-2xl font-bold sm:text-3xl", dark ? "text-white" : "text-foreground")}>
        {value}
      </p>
      <div className="mt-2 flex items-center gap-1.5">
        {up ? (
          <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <TrendingDown className="h-3.5 w-3.5 text-red-500" />
        )}
        <span className={cn("text-xs font-medium", up ? "text-emerald-500" : "text-red-500")}>
          {change}
        </span>
        <span className={cn("text-xs", dark ? "text-zinc-500" : "text-muted-foreground")}>
          지난달 대비
        </span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* ── Sidebar overlay (mobile) ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-56 flex-col bg-zinc-900 text-white transition-transform duration-300 ease-in-out dark:bg-zinc-950",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "lg:relative lg:translate-x-0",
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500">
              <Refrigerator className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold uppercase tracking-widest text-white">
              Dashboard
            </span>
          </Link>
          <button
            className="ml-auto lg:hidden text-zinc-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                item.active
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-white/10 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
              JM
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">James M.</p>
              <p className="text-xs text-zinc-500">admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md sm:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-foreground sm:text-lg">Overview</h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              {new Date().toLocaleDateString("ko-KR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search - tablet+ */}
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="검색..."
                className="h-8 w-40 rounded-lg border border-border bg-muted/50 pl-8 pr-3 text-xs outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 md:w-52"
              />
            </div>
            <button className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
              JM
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard title="Total Revenue" value="₩84,210" change="+12.4%" up />
            <StatCard title="New Orders" value="2,847" change="+8.7%" up />
            <StatCard title="Customers" value="18,492" change="+2.5%" up />
            <StatCard title="Conv. Rate" value="3.68%" change="-0.4%" up={false} dark />
          </div>

          {/* ── Revenue Overview + Traffic ── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Revenue chart */}
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-foreground">Revenue Overview</h2>
                  <p className="text-xs text-muted-foreground">Jan – Dec 2025</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
                    Revenue
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-600 inline-block" />
                    Target
                  </span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={revenueData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#colorRevenue)" dot={false} />
                  <Area type="monotone" dataKey="target" stroke="#94a3b8" strokeWidth={1.5} fill="none" strokeDasharray="4 2" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Traffic Sources */}
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <h2 className="mb-1 text-sm font-bold text-foreground">Traffic Sources</h2>
              <p className="mb-4 text-xs text-muted-foreground">This month</p>
              <div className="flex justify-center">
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie
                      data={trafficData}
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={62}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {trafficData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => [`${v}%`]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-1.5">
                {trafficData.map((item) => (
                  <li key={item.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full inline-block" style={{ background: item.color }} />
                      <span className="text-muted-foreground">{item.name}</span>
                    </span>
                    <span className="font-medium text-foreground">{item.value}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ── Sales by Category + Recent Orders ── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Sales chart */}
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-foreground">Sales by Category</h2>
                  <p className="text-xs text-muted-foreground">Quarterly breakdown</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={salesData} margin={{ top: 0, right: 4, left: -20, bottom: 0 }} barSize={8} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="category" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="q1" fill="#10b981" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="q2" fill="#6366f1" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="q3" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="q4" fill="#94a3b8" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Products */}
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <h2 className="mb-4 text-sm font-bold text-foreground">Top Products</h2>
              <ul className="space-y-3">
                {topProducts.map((product) => (
                  <li key={product.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className={cn("truncate pr-2 text-muted-foreground", product.highlight && "font-semibold text-foreground")}>
                        {product.name}
                      </span>
                      <span className={cn("shrink-0 font-semibold", product.highlight ? "text-red-500" : "text-foreground")}>
                        {product.revenue}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", product.highlight ? "bg-red-500" : "bg-emerald-500")}
                        style={{ width: `${product.bar}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ── Recent Orders ── */}
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">Recent Orders</h2>
              <button className="flex items-center gap-1 text-xs text-emerald-500 hover:underline">
                View all <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full min-w-[480px] text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 pl-4 text-left font-semibold text-muted-foreground sm:pl-0">주문 번호</th>
                    <th className="pb-2 text-left font-semibold text-muted-foreground">고객명</th>
                    <th className="pb-2 text-left font-semibold text-muted-foreground">상태</th>
                    <th className="pb-2 pr-4 text-right font-semibold text-muted-foreground sm:pr-0">금액</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 pl-4 font-mono text-foreground sm:pl-0">{order.id}</td>
                      <td className="py-2.5 text-foreground">{order.customer}</td>
                      <td className="py-2.5">
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", order.statusColor)}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-right font-semibold text-foreground sm:pr-0">{order.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Back to home */}
          <div className="pb-2 text-center">
            <Link
              href="/"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← 홈으로 돌아가기
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
