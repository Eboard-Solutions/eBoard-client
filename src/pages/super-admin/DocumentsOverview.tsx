// src/pages/super-admin/DocumentsOverview.tsx
import { useState, useMemo } from 'react';
import { FileText, Search, File, Image, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useDocuments } from '@/hooks/api/useDocuments';
import type { Document as DocType } from '@/types/api.types';
import { SuperAdminPageHeader } from './_SuperAdminPageHeader';
import { HardDrive } from 'lucide-react';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function getFileIcon(fileType: string) {
  if (fileType?.startsWith('image')) return Image;
  if (fileType?.includes('spreadsheet') || fileType?.includes('excel')) return FileSpreadsheet;
  return File;
}

export function DocumentsOverview() {
  const { data, isLoading, isError } = useDocuments();
  const documents: DocType[] = isError ? [] : (Array.isArray(data) ? data : (data as any)?.items ?? []);

  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return documents;
    const q = search.toLowerCase();
    return documents.filter(d =>
      d.title?.toLowerCase().includes(q) ||
      d.fileName?.toLowerCase().includes(q) ||
      d.description?.toLowerCase().includes(q)
    );
  }, [documents, search]);

  const stats = useMemo(() => {
    const totalSize = documents.reduce((sum, d) => sum + (d.fileSize || 0), 0);
    return {
      total: documents.length,
      totalSize: formatFileSize(totalSize),
    };
  }, [documents]);

  return (
    <div className="space-y-6">
      <SuperAdminPageHeader
        icon={FileText}
        eyebrow="Platform Data"
        title="Documents"
        subtitle="Every uploaded document across organisations — by access level, type, and date."
        gradient="from-orange-500 via-amber-500 to-red-600"
        stats={[
          { label: 'Total Documents', value: stats.total,     icon: FileText },
          { label: 'Total Size',      value: stats.totalSize, icon: HardDrive },
          { label: 'Showing',         value: filtered.length, icon: Search },
        ]}
      />

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin h-8 w-8 border-2 border-violet-500 border-t-transparent rounded-full mx-auto" />
              <p className="text-sm text-gray-500 mt-3">Loading documents...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-700 mb-3" />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {search ? 'No documents match your search' : 'No documents found'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Access Level</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((doc, idx) => {
                  const FileIcon = getFileIcon(doc.fileType);
                  return (
                    <TableRow key={doc.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <TableCell className="text-xs text-gray-400">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/40 dark:to-red-900/40 flex items-center justify-center flex-shrink-0">
                            <FileIcon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{doc.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{doc.fileName}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{doc.fileType?.split('/').pop() ?? '—'}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                        {formatFileSize(doc.fileSize || 0)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs">
                          {doc.accessLevel?.replace('_', ' ') ?? 'public'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                        {doc.uploadedByName ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
