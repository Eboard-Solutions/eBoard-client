import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAnnouncements, useCreateAnnouncement } from '@/hooks/api/useAnnouncements';
import { authService } from '@/lib/auth';
import type { CreateAnnouncementData, AnnouncementAudienceType, Announcement } from '@/types/api.types';
import { Megaphone, Plus, Search, Pin, Calendar, Loader2 } from 'lucide-react';

export function Announcements() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  // Get current user info
  const user = authService.getUser();

  // Form state for creating announcements
  const [newAnnouncement, setNewAnnouncement] = useState<{
    title: string;
    content: string;
    isPinned: boolean;
    audienceType: AnnouncementAudienceType;
    expiresAt: string;
  }>({
    title: '',
    content: '',
    isPinned: false,
    audienceType: 'ALL' as AnnouncementAudienceType,
    expiresAt: '',
  });

  // Fetch announcements from API
  const { data: announcementsData, isLoading, error } = useAnnouncements({ query: searchQuery });
  const createAnnouncementMutation = useCreateAnnouncement();

  const announcements: Announcement[] = Array.isArray(announcementsData)
    ? announcementsData
    : (announcementsData as { items?: Announcement[] })?.items || [];

  const filteredAnnouncements = announcements.filter((ann: Announcement) =>
    ann.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ann.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedAnnouncements = filteredAnnouncements.filter((a: Announcement) => a.isPinned);
  const regularAnnouncements = filteredAnnouncements.filter((a: Announcement) => !a.isPinned);

  const formatDate = (timestamp: number | string) => {
    const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleCreateAnnouncement = async () => {
    if (!newAnnouncement.title || !newAnnouncement.content) {
      toast.error('Please fill in title and content');
      return;
    }

    try {
      const data: CreateAnnouncementData = {
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        isPinned: newAnnouncement.isPinned,
        audience: {
          type: newAnnouncement.audienceType,
        },
        publishedBy: user?.userId || '',
        publishedByName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
        publishedAt: Date.now(),
        expiresAt: newAnnouncement.expiresAt ? new Date(newAnnouncement.expiresAt).getTime() : undefined,
      };

      await createAnnouncementMutation.mutateAsync(data);
      toast.success('Announcement published successfully!');
      setIsCreateDialogOpen(false);
      setNewAnnouncement({
        title: '',
        content: '',
        isPinned: false,
        audienceType: 'ALL' as AnnouncementAudienceType,
        expiresAt: '',
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to create announcement');
    }
  };

  if (error) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-semibold text-destructive">Error loading announcements</h2>
        <p className="mt-2 text-muted-foreground">{(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Announcements</h1>
          <p className="text-muted-foreground mt-1">
            Share updates and news with board members
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              New Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Announcement</DialogTitle>
              <DialogDescription>
                Share an announcement with board members
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="ann-title">Title *</Label>
                <Input 
                  id="ann-title" 
                  placeholder="Announcement title"
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea 
                  id="content" 
                  placeholder="Write your announcement..."
                  rows={6}
                  value={newAnnouncement.content}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="audience">Target Audience</Label>
                <Select 
                  value={newAnnouncement.audienceType}
                  onValueChange={(value) => setNewAnnouncement({ ...newAnnouncement, audienceType: value as AnnouncementAudienceType })}
                >
                  <SelectTrigger id="audience">
                    <SelectValue placeholder="Select audience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Members</SelectItem>
                    <SelectItem value="BOARD_MEMBERS">Board Members Only</SelectItem>
                    <SelectItem value="ADMINS">Admins Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="space-y-1">
                  <Label htmlFor="pin" className="cursor-pointer">Pin Announcement</Label>
                  <p className="text-xs text-muted-foreground">
                    Pinned announcements appear at the top
                  </p>
                </div>
                <Switch 
                  id="pin" 
                  checked={newAnnouncement.isPinned}
                  onCheckedChange={(checked) => setNewAnnouncement({ ...newAnnouncement, isPinned: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expires">Expires On (optional)</Label>
                <Input 
                  id="expires" 
                  type="date"
                  value={newAnnouncement.expiresAt}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, expiresAt: e.target.value })}
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateAnnouncement}
                  disabled={createAnnouncementMutation.isPending}
                >
                  {createAnnouncementMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    'Publish'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading announcements...</span>
        </div>
      )}

      {/* Search */}
      <Card className="glass">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search announcements..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Pinned Announcements */}
      {pinnedAnnouncements.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Pin className="h-5 w-5" />
            Pinned Announcements
          </h2>
          {pinnedAnnouncements.map((announcement) => (
            <Card key={announcement.id} className="glass border-primary/50 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 shrink-0">
                    <Megaphone className="h-6 w-6 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-semibold">{announcement.title}</h3>
                          <Badge variant="secondary" className="text-xs">Pinned</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>By {announcement.publishedByName || 'Unknown'}</span>
                          <span>•</span>
                          <span>{formatDate(announcement.publishedAt)}</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-muted-foreground mt-3 whitespace-pre-line">
                      {announcement.content}
                    </p>

                    {announcement.expiresAt && (
                      <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Expires: {formatDate(announcement.expiresAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Regular Announcements */}
      <div className="space-y-3">
        {pinnedAnnouncements.length > 0 && (
          <h2 className="text-lg font-semibold">Recent Announcements</h2>
        )}
        
        {regularAnnouncements.map((announcement) => (
          <Card key={announcement.id} className="glass hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-accent shrink-0">
                  <Megaphone className="h-6 w-6" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-1">{announcement.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>By {announcement.publishedByName || 'Unknown'}</span>
                        <span>•</span>
                        <span>{formatDate(announcement.publishedAt)}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  </div>

                  <p className="text-muted-foreground mt-3 whitespace-pre-line">
                    {announcement.content}
                  </p>

                  {announcement.expiresAt && (
                    <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Expires: {formatDate(announcement.expiresAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAnnouncements.length === 0 && (
        <Card className="glass">
          <CardContent className="p-12">
            <div className="text-center text-muted-foreground">
              <Megaphone className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No announcements</p>
              <p className="text-sm">Create your first announcement to get started</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}