'use client';

import type React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  color,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  color: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className={`h-10 w-10 rounded-2xl ${color} flex items-center justify-center shadow-sm shadow-black/10`}>
          <Icon className="h-4.5 w-4.5 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-balance">{title}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

export function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative w-full min-w-0 sm:max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 rounded-xl pl-9 pr-8 text-sm"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  sub,
}: {
  icon: React.ElementType;
  title: string;
  sub?: string;
}) {
  return (
    <div className="py-20 text-center rounded-2xl border border-dashed border-border/80 bg-muted/10">
      <Icon className="h-10 w-10 mx-auto mb-3 text-muted-foreground/25" />
      <p className="font-semibold">{title}</p>
      {sub && <p className="text-sm text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

// ── API data unwrappers ───────────────────────────────────────────────

export function unwrapList<T>(data: any): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.data)) return data.data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  return [];
}

export function unwrap<T>(data: any): T | null {
  if (!data) return null;
  if (data?.data?.data) return data.data.data;
  if (data?.data) return data.data;
  return data;
}