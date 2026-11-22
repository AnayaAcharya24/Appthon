import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { AppthonLogo } from './ui/AppthonLogo';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export function PortalLayout({
  title,
  subtitle,
  items,
  activeId,
  onSelect,
  children,
}: {
  title: string;
  subtitle: string;
  items: SidebarNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSelect = (id: string) => {
    onSelect(id);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#080810] text-white flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between border-b border-white/10 bg-[#0B0B14] px-4 py-3">
        <Link to="/">
          <AppthonLogo />
        </Link>
        <button
          type="button"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label="Toggle portal menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-white"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-[265px] shrink-0 flex-col border-r border-white/10 bg-[#0B0B14] transition-transform lg:static lg:flex lg:translate-x-0',
          sidebarOpen ? 'flex translate-x-0' : 'hidden'
        )}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
          <Link to="/">
            <AppthonLogo />
          </Link>
        </div>

        <div className="px-5 py-4 border-b border-white/10">
          <p className="text-xs font-medium tracking-wider text-[#A64AFF] uppercase">{title}</p>
          <p className="mt-1 truncate text-xs text-white/60">{user?.email}</p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = activeId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={cn(
                  'flex w-full items-center justify-between gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm transition-colors cursor-pointer',
                  active
                    ? 'bg-[#7024D8]/25 text-white font-medium border border-[#7024D8]/40'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                )}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-[#A64AFF]' : 'text-white/50')} />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="rounded-full bg-[#7024D8] px-2 py-0.5 font-mono text-[11px] text-white tabular-nums">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4 space-y-2">
          <Link
            to="/"
            className="block rounded-xl px-3.5 py-2 text-xs text-white/65 hover:bg-white/5 hover:text-white"
          >
            ← Back to Public Website
          </Link>
          <button
            type="button"
            onClick={() => logout().then(() => navigate('/login'))}
            className="flex w-full items-center gap-2 rounded-xl px-3.5 py-2 text-xs text-rose-300 hover:bg-rose-500/10 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        <div className="border-b border-white/10 bg-[#080810] px-6 py-5 sm:px-10">
          <p className="text-xs text-white/50">{subtitle}</p>
          <h1 className="mt-1 font-display text-3xl text-white">
            {items.find((i) => i.id === activeId)?.label || title}
          </h1>
        </div>

        <div className="mx-auto max-w-[1160px] px-6 py-8 sm:px-10">{children}</div>
      </main>
    </div>
  );
}
