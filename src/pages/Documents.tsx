import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDocuments, useCreateDocument, useDeleteDocument } from '@/hooks/api/useDocuments';
import type { DocumentAccessLevel } from '@/types/api.types';
import { 
  Search, 
  Upload, 
  FileText, 
  Download, 
  Eye, 
  MoreVertical,
  Folder,
  Star,
  Share2,
  Trash,
  Loader2
} from 'lucide-react';

export function Documents() {
  const [searchQuery, setSearchQuery] = useState('');
  const [accessFilter, setAccessFilter] = useState<string>('all');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state for uploading documents
  const [newDocument, setNewDocument] = useState<{
    title: string;
    file: File | null;
    accessLevel: DocumentAccessLevel;
    tags: string;
  }>({
    title: '',
    file: null,
    accessLevel: 'board_only',
    tags: '',
  });

  // Fetch documents from API
  const { data: documentsData, isLoading, error } = useDocuments({
    query: searchQuery,
    accessLevel: accessFilter === 'all' ? undefined : accessFilter as DocumentAccessLevel,
  });
  const createDocumentMutation = useCreateDocument();
  const deleteDocumentMutation = useDeleteDocument();

  const documents = documentsData?.items || [];

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.tags || []).some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesAccess = accessFilter === 'all' || doc.accessLevel === accessFilter;
    return matchesSearch && matchesAccess;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('sheet') || fileType.includes('excel')) return '📊';
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return '📽️';
    return '📎';
  };

  const getAccessBadgeVariant = (level: string) => {
    switch (level) {
      case 'public': return 'default';
      case 'board_only': return 'secondary';
      case 'admin_only': return 'destructive';
      default: return 'outline';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewDocument({ 
        ...newDocument, 
        file,
        title: newDocument.title || file.name.replace(/\.[^/.]+$/, '')
      });
    }
  };

  const handleUploadDocument = async () => {
    if (!newDocument.file) {
      toast.error('Please select a file to upload');
      return;
    }
    if (!newDocument.title) {
      toast.error('Please enter a document title');
      return;
    }

    try {
      await createDocumentMutation.mutateAsync({
        title: newDocument.title,
        file: newDocument.file,
        accessLevel: newDocument.accessLevel,
        tags: newDocument.tags ? newDocument.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      });
      toast.success('Document uploaded successfully!');
      setIsUploadDialogOpen(false);
      setNewDocument({
        title: '',
        file: null,
        accessLevel: 'board_only',
        tags: '',
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload document');
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      await deleteDocumentMutation.mutateAsync(docId);
      toast.success('Document deleted successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete document');
    }
  };

  if (error) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-semibold text-destructive">Error loading documents</h2>
        <p className="mt-2 text-muted-foreground">{(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground mt-1">
            Manage files, folders, and board records
          </p>
        </div>
        
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2">
              <Upload className="h-5 w-5" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
              <DialogDescription>
                Add a new document to the library
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                onChange={handleFileSelect}
              />
              
              <div 
                className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {newDocument.file ? (
                  <>
                    <FileText className="h-12 w-12 mx-auto mb-4 text-primary" />
                    <p className="text-sm font-medium mb-1">{newDocument.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(newDocument.file.size)}
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground">PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX (max 10MB)</p>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="doc-title">Document Title *</Label>
                <Input 
                  id="doc-title" 
                  placeholder="e.g., Q1 Financial Report"
                  value={newDocument.title}
                  onChange={(e) => setNewDocument({ ...newDocument, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="access">Access Level</Label>
                <Select 
                  value={newDocument.accessLevel}
                  onValueChange={(value) => setNewDocument({ ...newDocument, accessLevel: value as DocumentAccessLevel })}
                >
                  <SelectTrigger id="access">
                    <SelectValue placeholder="Select access level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="board_only">Board Members Only</SelectItem>
                    <SelectItem value="admin_only">Admins Only</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <Input 
                  id="tags" 
                  placeholder="budget, finance, 2024"
                  value={newDocument.tags}
                  onChange={(e) => setNewDocument({ ...newDocument, tags: e.target.value })}
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUploadDocument}
                  disabled={createDocumentMutation.isPending}
                >
                  {createDocumentMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Upload'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="glass">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={accessFilter} onValueChange={setAccessFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Access level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Documents</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="board_only">Board Only</SelectItem>
                <SelectItem value="admin_only">Admin Only</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon">
              <Folder className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading documents...</span>
        </div>
      )}

      {/* Documents List */}
      <div className="space-y-3">
        {filteredDocuments.map((doc) => (
          <Card key={doc.id} className="glass hover:shadow-lg transition-all">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* File Icon */}
                <div className="flex items-center justify-center w-14 h-14 rounded-lg bg-accent text-3xl shrink-0">
                  {getFileIcon(doc.fileType)}
                </div>

                {/* Document Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{doc.title}</h3>
                    {doc.accessLevel && (
                      <Badge variant={getAccessBadgeVariant(doc.accessLevel)} className="text-xs shrink-0">
                        {doc.accessLevel.replace('_', ' ')}
                      </Badge>
                    )}
                    {doc.version > 1 && (
                      <Badge variant="outline" className="text-xs">
                        v{doc.version}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{formatFileSize(doc.fileSize)}</span>
                    <span>•</span>
                    <span>Uploaded {formatDate(doc.uploadedAt)}</span>
                    {doc.uploadedByName && (
                      <>
                        <span>•</span>
                        <span>by {doc.uploadedByName}</span>
                      </>
                    )}
                  </div>

                  {doc.tags && doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {doc.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button 
                    size="icon" 
                    variant="outline" 
                    className="h-9 w-9"
                    onClick={() => window.open(doc.fileUrl, '_blank')}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="outline" 
                    className="h-9 w-9"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = doc.fileUrl;
                      link.download = doc.fileName;
                      link.click();
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-9 w-9">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Star className="mr-2 h-4 w-4" />
                        Add to Favorites
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Share2 className="mr-2 h-4 w-4" />
                        Share
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        const link = document.createElement('a');
                        link.href = doc.fileUrl;
                        link.download = doc.fileName;
                        link.click();
                      }}>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => handleDeleteDocument(doc.id)}
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDocuments.length === 0 && (
        <Card className="glass">
          <CardContent className="p-12">
            <div className="text-center text-muted-foreground">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No documents found</p>
              <p className="text-sm">Try adjusting your search or upload a new document</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}