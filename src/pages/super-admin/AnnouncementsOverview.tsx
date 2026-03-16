// src/pages/super-admin/AnnouncementsOverview.tsx
import { useState, useMemo } from 'react';
import { Megaphone, Search, Pin, Users, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useAnnouncements } from '@/hooks/api/useAnnouncements';
import type { Announcement } from '@/types/api.types';

export function AnnouncementsOverview() {
  const { data, isLoading, isError } = useAnnouncements();
  const announcements: Announcement[] = isError ? [] : (Array.isArray(data) ? data : (data as any)?.items ?? []);

  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return announcements;
    const q = search.toLowerCase();
    return announcements.filter(a =>
      a.title?.toLowerCase().includes(q) ||
      a.content?.toLowerCase().includes(q) ||
      a.publishedByName?.toLowerCase().includes(q)
    );
  }, [announcements, search]);

  const stats = useMemo(() => ({
    total: announcements.length,
    pinned: announcements.filter(a => a.isPinned).length,
  }), [announcements]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Announcements</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Overview of all platform announcements</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Total</p>
            <p className="text-2xl font-extrabold mt-1 text-indigo-600 dark:text-indigo-400">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Pinned</p>
            <p className="text-2xl font-extrabold mt-1 text-amber-600 dark:text-amber-400">{stats.pinned}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Showing</p>
            <p className="text-2xl font-extrabold mt-1 text-emerald-600 dark:text-emerald-400">{filtered.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input placeholder="Search announcements..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin h-8 w-8 border-2 border-violet-500 border-t-transparent rounded-full mx-auto" />
              <p className="text-sm text-gray-500 mt-3">Loading announcements...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Megaphone className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-700 mb-3" />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {search ? 'No announcements match your search' : 'No announcements found'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Announcement</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead>Published By</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead>Pinned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((ann, idx) => (
                  <TableRow key={ann.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                    <TableCell className="text-xs text-gray-400">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 flex items-center justify-center flex-shrink-0">
                          <Megaphone className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{ann.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[300px]">{ann.content}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs gap-1">
                        {ann.audience.type === 'ALL' && <Users className="h-3 w-3" />}
                        {ann.audience.type === 'ADMINS' && <ShieldCheck className="h-3 w-3" />}
                        <span className="capitalize">{ann.audience.type.replace('_', ' ').toLowerCase()}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                      {ann.publishedByName ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {ann.publishedAt ? new Date(ann.publishedAt).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell>
                      {ann.isPinned && (
                        <Pin className="h-4 w-4 text-amber-500" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
