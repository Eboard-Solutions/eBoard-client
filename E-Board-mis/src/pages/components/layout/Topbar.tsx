import { useState } from 'react';
import { useLocation } from 'wouter';
import { Bell, Plus, Search, Moon, Sun, Calendar, CheckSquare, Vote, User, LogOut, Settings } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { notifications } from '@/lib/store';
import { authService } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TopbarProps {
  sidebarCollapsed?: boolean;
}

export function Topbar({ sidebarCollapsed = false }: TopbarProps) {
  const [, setLocation] = useLocation();
  const [darkMode, setDarkMode] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;
  const currentUser = authService.getCurrentUser();

  if (!currentUser) return null;

  const handleSignOut = () => {
    authService.signOut();
    toast.success('Signed out successfully');
    setLocation('/auth/signin');
  };

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
    document.documentElement.classList.toggle('dark');
  };

  const handleQuickCreate = (type: 'meeting' | 'task' | 'poll' | 'announcement') => {
    const routes = {
      meeting: '/meetings?action=create',
      task: '/tasks?action=create',
      poll: '/voting?action=create',
      announcement: '/announcements?action=create',
    };
    setLocation(routes[type]);
  };

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-30 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-300',
        sidebarCollapsed ? 'left-16' : 'left-64'
      )}
    >
      <div className="flex items-center justify-between h-full px-6">
        {/* Search Bar */}
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search meetings, documents, members..."
              className="pl-10 bg-muted/50 border-0 focus-visible:ring-1"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">

          {/* Quick Create + */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" className="rounded-full">
                <Plus className="h-5 w-5" />
                <span className="sr-only">Quick create</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Quick Create</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => handleQuickCreate('meeting')}>
                <Calendar className="mr-2 h-4 w-4" />
                New Meeting
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleQuickCreate('task')}>
                <CheckSquare className="mr-2 h-4 w-4" />
                New Task
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleQuickCreate('poll')}>
                <Vote className="mr-2 h-4 w-4" />
                New Poll
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleQuickCreate('announcement')}>
                <Bell className="mr-2 h-4 w-4" />
                New Announcement
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Dark Mode Toggle */}
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleDarkMode}
            className="rounded-full"
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            <span className="sr-only">Toggle dark mode</span>
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="relative rounded-full">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs font-medium"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
                <span className="sr-only">Notifications</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96">
              <DropdownMenuLabel className="flex items-center justify-between">
                Notifications
                {unreadCount > 0 && <span className="text-xs text-muted-foreground">{unreadCount} unread</span>}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-96 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.slice(0, 8).map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className={cn(
                        'flex flex-col items-start gap-2 p-4 cursor-pointer rounded-lg mx-2 mt-1',
                        !notification.read && 'bg-accent/50'
                      )}
                    >
                      <div className="flex items-start justify-between w-full gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{notification.title}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="py-12 text-center text-muted-foreground text-sm">
                    No notifications yet
                  </div>
                )}
              </div>
              {notifications.length > 8 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="justify-center text-primary font-medium">
                    View all notifications
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                  <AvatarFallback>
                    {currentUser.name
                      .split(' ')
                      .map(n => n[0]?.toUpperCase())
                      .join('')
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" align="end" forceMount>
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-2">
                  <p className="text-sm font-semibold leading-none">{currentUser.name}</p>
                  <p className="text-xs text-muted-foreground">{currentUser.email}</p>
                  <Badge variant="secondary" className="w-fit text-xs">
                    {currentUser.role.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setLocation('/profile')}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}