'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  TrendingUp,
  AlertTriangle,
  Settings,
  Boxes,
  ChevronRight,
  LogOut,
  Truck,
  LayoutGrid,
  Users as UsersIcon,
  Camera,
  ShoppingCart,
  ClipboardList,
  ClipboardCheck,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/', roles: ['admin', 'manager', 'staff', 'auditor'] },
  { icon: Package, label: 'Inventory', href: '/inventory', roles: ['manager', 'staff', 'auditor'] },
  { icon: Truck, label: 'Stock Management', href: '/stock', roles: ['manager', 'staff'] },
  { icon: ClipboardCheck, label: 'Stock Requests', href: '/stock-requests', roles: ['manager', 'staff', 'auditor'] },
  { icon: LayoutGrid, label: 'Categories', href: '/categories', roles: ['manager', 'auditor'] },
  { icon: Truck, label: 'Supplier Management', href: '/suppliers', roles: ['manager'] },
  { icon: UsersIcon, label: 'User Management', href: '/users', roles: ['admin'] },
  { icon: TrendingUp, label: 'AI Forecasts', href: '/forecasts', roles: ['manager'] },
  { icon: ShoppingCart, label: 'Reorder Suggestions', href: '/reorder', roles: ['manager'] },
  { icon: ClipboardList, label: 'Purchase Orders', href: '/purchase-orders', roles: ['manager', 'staff', 'auditor'] },
  { icon: Camera, label: 'CV Scanner', href: '/scanner', roles: ['staff'] },
  { icon: AlertTriangle, label: 'Alerts', href: '/alerts', roles: ['admin', 'manager', 'staff', 'auditor'] },
  { icon: ShieldCheck, label: 'Audit Logs', href: '/audit-logs', roles: ['auditor'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside
      className="fixed top-0 left-0 h-screen bg-white border-r border-slate-200 flex flex-col"
      style={{ width: '260px', zIndex: 40 }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5" style={{ height: '64px', borderBottom: '1px solid #f1f5f9' }}>
        <div
          className="flex items-center justify-center rounded-lg"
          style={{ width: 34, height: 34, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          <Boxes className="text-white" size={18} />
        </div>
        <span className="font-bold text-slate-900" style={{ fontSize: 17 }}>
          Nex<span style={{ color: '#6366f1' }}>Stock</span>
        </span>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 px-3">
          Main Menu
        </p>
        <nav className="space-y-0.5">
          {navItems.filter(item => item.roles.includes(user?.role || '')).map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg transition-all duration-150"
                style={{
                  padding: '9px 12px',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: 14,
                  color: isActive ? '#6366f1' : '#64748b',
                  background: isActive ? '#eef2ff' : 'transparent',
                }}
              >
                <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight size={14} style={{ color: '#6366f1' }} />}
              </Link>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="my-4 border-t border-slate-100" />

        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 px-3">
          System
        </p>
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-lg transition-all duration-150"
          style={{ padding: '9px 12px', fontWeight: 500, fontSize: 14, color: '#64748b' }}
        >
          <Settings size={18} strokeWidth={2} />
          <span>Settings</span>
        </Link>
      </div>

      {/* User Profile at bottom */}
      <div className="px-3 py-3 border-t border-slate-100">
        <div
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors group"
          style={{ background: '#f8fafc' }}
        >
          <div
            className="rounded-full flex items-center justify-center text-white font-bold shrink-0 text-xs"
            style={{
              width: 34,
              height: 34,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            }}
          >
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{user?.name || 'Loading...'}</p>
            <p className="text-xs text-slate-400 truncate capitalize">{user?.role || 'User'}</p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
