import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Document } from '@/types/api.types';
import { FileText, Download, Eye } from 'lucide-react';

interface RecentDocumentsWidgetProps {
  documents: Document[];
}

export function RecentDocumentsWidget({ documents }: RecentDocumentsWidgetProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (raw: string | number | null | undefined) => {
    if (raw === null || raw === undefined || raw === '') return '—';
    // `uploadedAt` comes back from the API as either a Unix ms number
    // (bigint columns are serialized that way) or an ISO string.
    const ms = typeof raw === 'number' ? raw : Number.isFinite(Number(raw)) && /^\d+$/.test(String(raw)) ? Number(raw) : Date.parse(String(raw));
    if (!Number.isFinite(ms)) return '—';
    const date = new Date(ms);
    if (isNaN(date.getTime())) return '—';
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const safeFileType = (t?: string) => (t ?? '').toLowerCase();

  const getFileIcon = (fileType?: string) => {
    const t = safeFileType(fileType);
    if (t.includes('pdf')) return '📄';
    if (t.includes('word') || t.includes('document')) return '📝';
    if (t.includes('sheet') || t.includes('excel')) return '📊';
    if (t.includes('presentation') || t.includes('powerpoint')) return '📽️';
    return '📎';
  };

  const formatSizeSafe = (bytes: number | string | null | undefined) => {
    const n = typeof bytes === 'number' ? bytes : Number(bytes);
    if (!Number.isFinite(n) || n <= 0) return '—';
    return formatFileSize(n);
  };

  return (
    <Card className="glass">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg font-semibold">Recent Documents</CardTitle>
        <Button variant="ghost" size="sm">View All</Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent text-2xl shrink-0">
              {getFileIcon(doc.fileType)}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">{doc.title}</h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  {formatSizeSafe(doc.fileSize)}
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(doc.uploadedAt)}
                </span>
                {doc.version > 1 && (
                  <>
                    <span className="text-xs text-muted-foreground">•</span>
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      v{doc.version}
                    </Badge>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <Eye className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {documents.length === 0 && (
          <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
            <FileText className="h-12 w-12 text-muted-foreground/50" />
            <p>No recent documents</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}