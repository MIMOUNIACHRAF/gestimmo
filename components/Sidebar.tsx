"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Map,
  Home,
  Users,
  BarChart3,
  LogOut,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
  { href: "/plan", icon: Map, label: "Plan de Masse" },
  { href: "/appartements", icon: Home, label: "Appartements" },
  { href: "/clients", icon: Users, label: "Clients" },
  { href: "/rapports", icon: BarChart3, label: "Rapports" },
];

export default function Sidebar({ user }: { user: { name?: string | null; email?: string | null; role?: string } }) {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-[#0b0e18] border-r border-[#1c2336] flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-[#1c2336]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-white flex items-center justify-center shadow-lg shadow-blue-500/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="OTAB" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="text-white font-bold text-sm tracking-wide">GestImmo Pro</div>
            <div className="text-slate-500 text-xs">Secteur N°2</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                active
                  ? "bg-blue-600/20 text-blue-400 border border-blue-600/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="w-3 h-3 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-[#1c2336]">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-500 flex items-center justify-center text-white text-xs font-bold uppercase">
            {user?.name?.[0] ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-medium truncate">{user?.name ?? "Utilisateur"}</div>
            <div className="text-slate-500 text-xs truncate">{user?.role === "ADMIN" ? "Administrateur" : "Agent"}</div>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all text-sm"
        >
          <LogOut className="w-4 h-4" />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}
