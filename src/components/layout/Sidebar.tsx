// src/components/layout/Sidebar.tsx
import { Link, useLocation } from 'wouter';
import { useState } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Users,
  FileText,
  CheckSquare,
  Vote,
  DollarSign,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bell,
  BarChart3,
  HelpCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SidebarProps {
  className?: string;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: Calendar, label: 'Meetings', href: '/meetings' },
  { icon: Users, label: 'Members', href: '/members' },
  { icon: FileText, label: 'Documents', href: '/documents' },
  { icon: Vote, label: 'Voting', href: '/voting' },
  { icon: CheckSquare, label: 'Tasks', href: '/tasks' },
  { icon: DollarSign, label: 'Finance', href: '/finance' },
  { icon: Bell, label: 'Announcements', href: '/announcements' },
  { icon: BarChart3, label: 'Reports', href: '/reports' },
];

const bottomNavItems = [
  { icon: Settings, label: 'Settings', href: '/settings' },
  { icon: HelpCircle, label: 'Help', href: '/help' },
];

export function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'glass-strong fixed left-0 top-0 z-40 flex h-screen flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Logo & Collapse Button */}
      <div className="flex items-center justify-between border-b border-border p-4">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <span className="font-bold text-primary-foreground">EB</span>
            </div>
            <span className="text-xl font-bold">E-Board</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn('h-8 w-8', collapsed && 'mx-auto')}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          <span className="sr-only">Toggle sidebar</span>
        </Button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  'hover:bg-accent hover:text-accent-foreground',
                  isActive && 'bg-primary text-primary-foreground hover:bg-primary/90',
                  collapsed && 'justify-center'
                )}
              >
                <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary-foreground')} />
                {!collapsed && <span>{item.label}</span>}
                {collapsed && <span className="sr-only">{item.label}</span>}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-border p-3">
        <nav className="space-y-1">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;

            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                    'hover:bg-accent hover:text-accent-foreground',
                    isActive && 'bg-primary text-primary-foreground hover:bg-primary/90',
                    collapsed && 'justify-center'
                  )}
                >
                  <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary-foreground')} />
                  {!collapsed && <span>{item.label}</span>}
                  {collapsed && <span className="sr-only">{item.label}</span>}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}