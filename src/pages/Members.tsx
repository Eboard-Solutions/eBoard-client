import { useState, useMemo, useCallback, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
//import { ConfirmationModal } from '@/components/ui/confirmation-modal'
import { users as storeUsers, departments, roles, auditLogs, currentUser } from '@/lib/store'
import { User, MemberStatus, UserRole, UserActivity } from '@/types'
import { 
  Search, Plus, Mail, Phone, Building, Grid, List, 
  MoreVertical, Edit, Shield, Key, Trash2, Eye,
  Download, Upload, FileText, Clock, ShieldAlert,
  CheckCircle, XCircle, AlertCircle, Filter, SortAsc,
  X, Activity, Users
} from 'lucide-react'
import { toast } from 'sonner'

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}

// Status badge component
function StatusBadge({ status }: { status: MemberStatus }) {
  const config = {
    active: { color: 'bg-green-500', label: 'Active', icon: CheckCircle },
    inactive: { color: 'bg-gray-500', label: 'Inactive', icon: XCircle },
    suspended: { color: 'bg-red-500', label: 'Suspended', icon: AlertCircle },
    pending_invite: { color: 'bg-yellow-500', label: 'Pending Invite', icon: Clock },
  }
  const { color, label, icon: Icon } = config[status]
  
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-xs">{label}</span>
    </span>
  )
}

// Loading skeleton component
function MemberCardSkeleton() {
  return (
    <Card className="glass animate-pulse">
      <CardContent className="p-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-24 w-24 rounded-full bg-muted" />
          <div className="space-y-2 text-center">
            <div className="h-5 w-32 bg-muted rounded mx-auto" />
            <div className="h-4 w-24 bg-muted rounded mx-auto" />
            <div className="h-5 w-20 bg-muted rounded mx-auto" />
          </div>
          <div className="w-full space-y-2 pt-2 border-t border-border">
            <div className="h-4 w-full bg-muted rounded" />
            <div className="h-4 w-3/4 bg-muted rounded" />
          </div>
          <div className="h-9 w-full bg-muted rounded" />
        </div>
      </CardContent>
    </Card>
  )
}

// Activity Modal
function ActivityModal({ 
  user, 
  open, 
  onOpenChange 
}: { 
  user: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!user) return null
  
  const loginHistory = user.loginHistory || []
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Log - {user.name}
          </DialogTitle>
          <DialogDescription>
            View login history and account activity
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Security Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Account Created</p>
              <p className="font-medium">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Login</p>
              <p className="font-medium">
                {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">2FA Status</p>
              <p className="font-medium flex items-center gap-2">
                {user.twoFactorEnabled ? (
                  <><CheckCircle className="h-4 w-4 text-green-500" /> Enabled</>
                ) : (
                  <><XCircle className="h-4 w-4 text-gray-500" /> Disabled</>
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Activities</p>
              <p className="font-medium">{loginHistory.length} records</p>
            </div>
          </div>
          
          {/* Login History */}
          <div>
            <h4 className="font-semibold mb-3">Recent Activity</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {loginHistory.length > 0 ? (
                loginHistory.map((activity: UserActivity) => (
                  <div 
                    key={activity.id} 
                    className="flex items-center justify-between p-3 bg-background rounded-lg border"
                  >
                    <div>
                      <p className="font-medium">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">
                        IP: {activity.ipAddress || 'Unknown'}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No activity recorded</p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Edit Member Modal
function EditMemberModal({
  user,
  open,
  onOpenChange,
  onSave
}: {
  user: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (user: User) => void
}) {
  const [formData, setFormData] = useState<Partial<User>>({})
  
  useEffect(() => {
    if (user) setFormData(user)
  }, [user])
  
  if (!user) return null
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Member</DialogTitle>
          <DialogDescription>
            Update member information
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Full Name</Label>
            <Input 
              id="edit-name" 
              value={formData.name || ''}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input 
              id="edit-email" 
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-position">Position</Label>
            <Input 
              id="edit-position" 
              value={formData.position || ''}
              onChange={(e) => setFormData({...formData, position: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-department">Department</Label>
            <Select 
              value={formData.department}
              onValueChange={(value) => setFormData({...formData, department: value})}
            >
              <SelectTrigger id="edit-department">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => { onSave({...user, ...formData}); onOpenChange(false) }}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Bulk Actions Bar
function BulkActionBar({
  selectedCount,
  onClearSelection,
  onBulkAction
}: {
  selectedCount: number
  onClearSelection: () => void
  onBulkAction: (action: string) => void
}) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-background border rounded-lg shadow-lg p-4 flex items-center gap-4 animate-in slide-in-from-bottom-4">
      <span className="font-medium">{selectedCount} selected</span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => onBulkAction('role')}>
          <Shield className="h-4 w-4 mr-1" />
          Change Role
        </Button>
        <Button variant="outline" size="sm" onClick={() => onBulkAction('department')}>
          <Building className="h-4 w-4 mr-1" />
          Assign Department
        </Button>
        <Button variant="outline" size="sm" onClick={() => onBulkAction('activate')}>
          <CheckCircle className="h-4 w-4 mr-1" />
          Activate
        </Button>
        <Button variant="outline" size="sm" onClick={() => onBulkAction('deactivate')}>
          <XCircle className="h-4 w-4 mr-1" />
          Deactivate
        </Button>
        <Button 
          variant="destructive" 
          size="sm" 
          onClick={() => onBulkAction('delete')}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
      </div>
      <Button variant="ghost" size="icon" onClick={onClearSelection}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

// Audit Log Modal
function AuditLogModal({
  open,
  onOpenChange
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Audit Log
          </DialogTitle>
          <DialogDescription>
            Track member management activities
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-2 py-4">
          {auditLogs.map((log) => (
            <div 
              key={log.id} 
              className="flex items-center justify-between p-3 bg-background rounded-lg border"
            >
              <div>
                <p className="font-medium">
                  {log.action === 'role_changed' && `Changed role of ${log.targetUserName}`}
                  {log.action === 'member_removed' && `Removed ${log.targetUserName}`}
                  {log.action === 'status_updated' && `Updated status of ${log.targetUserName}`}
                  {log.action === 'member_created' && `Invited ${log.targetUserName}`}
                  {log.action === 'bulk_action' && `Bulk updated ${log.targetUserName}`}
                  {log.action === 'department_changed' && `Changed department of ${log.targetUserName}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  By {log.userName} • IP: {log.ipAddress || 'Unknown'}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(log.timestamp).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Import/Export Modal
function ImportExportModal({
  open,
  onOpenChange
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [mode, setMode] = useState<'import' | 'export'>('export')
  
  const handleExport = () => {
    const csvContent = [
      ['Name', 'Email', 'Role', 'Department', 'Position', 'Status'].join(','),
      ...storeUsers.map(u => [
        u.name, u.email, u.role, u.department || '', u.position || '', u.status || 'active'
      ].join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'members.csv'
    a.click()
    URL.revokeObjectURL(url)
    
    toast.success('Members exported successfully')
    onOpenChange(false)
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import / Export Members</DialogTitle>
          <DialogDescription>
            Bulk import or export member data
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <Button 
              variant={mode === 'export' ? 'default' : 'outline'} 
              className="flex-1"
              onClick={() => setMode('export')}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button 
              variant={mode === 'import' ? 'default' : 'outline'} 
              className="flex-1"
              onClick={() => setMode('import')}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
          </div>
          
          {mode === 'export' ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Export all members to a CSV file for backup or analysis.
              </p>
              <Button onClick={handleExport} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download CSV
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload a CSV file to import members in bulk.
              </p>
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm">Drag and drop a CSV file here</p>
                <p className="text-xs text-muted-foreground">or click to browse</p>
              </div>
              <Button className="w-full" disabled>
                <Upload className="h-4 w-4 mr-2" />
                Upload CSV
              </Button>
              <p className="text-xs text-muted-foreground">
                CSV format: Name, Email, Role, Department, Position
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Role Management Modal
function RoleManagementModal({
  open,
  onOpenChange
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Role Management
          </DialogTitle>
          <DialogDescription>
            Manage roles and their permissions
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {roles.map((role) => (
            <div 
              key={role.id} 
              className="p-4 bg-background rounded-lg border"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-semibold flex items-center gap-2">
                    {role.name}
                    {role.isCritical && (
                      <ShieldAlert className="h-4 w-4 text-red-500" />
                    )}
                  </h4>
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                </div>
                {role.isDefault && (
                  <Badge variant="secondary">Default</Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {role.permissions.slice(0, 5).map((perm) => (
                  <Badge key={perm} variant="outline" className="text-xs">
                    {perm.replace('_', ' ')}
                  </Badge>
                ))}
                {role.permissions.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{role.permissions.length - 5} more
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Member Action Menu
function MemberActionMenu({ 
  user, 
  onEdit, 
  onChangeRole, 
  onResetPassword, 
  onSuspend, 
  onRemove,
  onViewActivity 
}: { 
  user: User
  onEdit: () => void
  onChangeRole: () => void
  onResetPassword: () => void
  onSuspend: () => void
  onRemove: () => void
  onViewActivity: () => void
}) {
  const [open, setOpen] = useState(false)
  
  return (
    <div className="relative">
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-8 w-8"
        onClick={() => setOpen(!open)}
      >
        <MoreVertical className="h-4 w-4" />
      </Button>
      {open && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setOpen(false)} 
          />
          <div className="absolute right-0 top-full mt-1 w-48 bg-background border rounded-lg shadow-lg z-50 py-1">
            <button
              className="w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
              onClick={() => { onEdit(); setOpen(false) }}
            >
              <Edit className="h-4 w-4" />
              Edit Member
            </button>
            <button
              className="w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
              onClick={() => { onChangeRole(); setOpen(false) }}
            >
              <Shield className="h-4 w-4" />
              Change Role
            </button>
            <button
              className="w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
              onClick={() => { onViewActivity(); setOpen(false) }}
            >
              <Activity className="h-4 w-4" />
              View Activity
            </button>
            <button
              className="w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
              onClick={() => { onResetPassword(); setOpen(false) }}
            >
              <Key className="h-4 w-4" />
              Reset Password
            </button>
            <button
              className="w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
              onClick={() => { onSuspend(); setOpen(false) }}
            >
              <AlertCircle className="h-4 w-4" />
              {user.status === 'suspended' ? 'Reactivate' : 'Suspend'}
            </button>
            <hr className="my-1" />
            <button
              className="w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-2 text-destructive"
              onClick={() => { onRemove(); setOpen(false) }}
            >
              <Trash2 className="h-4 w-4" />
              Remove Member
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export function Members() {
  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [lastActiveFilter, setLastActiveFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('name-asc')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  
  // Modal states
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [activityUser, setActivityUser] = useState<User | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [showAuditLog, setShowAuditLog] = useState(false)
  const [showImportExport, setShowImportExport] = useState(false)
  const [showRoleManagement, setShowRoleManagement] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  
  // Debounced search
  const debouncedSearch = useDebounce(searchQuery, 300)
  
  // Get local users state (simulating backend)
  const [localUsers, setLocalUsers] = useState<User[]>(storeUsers)
  
  // URL query params - persist filters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('role')) setRoleFilter(params.get('role')!)
    if (params.get('status')) setStatusFilter(params.get('status')!)
    if (params.get('department')) setDepartmentFilter(params.get('department')!)
    if (params.get('sort')) setSortBy(params.get('sort')!)
  }, [])
  
  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (roleFilter !== 'all') params.set('role', roleFilter)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (departmentFilter !== 'all') params.set('department', departmentFilter)
    if (sortBy !== 'name-asc') params.set('sort', sortBy)
    
    const newUrl = params.toString() 
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname
    window.history.replaceState({}, '', newUrl)
  }, [roleFilter, statusFilter, departmentFilter, sortBy])
  
  // Filter and sort users
  const filteredUsers = useMemo(() => {
    let result = [...localUsers]
    
    // Search
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase()
      result = result.filter(user => 
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.position?.toLowerCase().includes(query)
      )
    }
    
    // Filters
    if (roleFilter !== 'all') {
      result = result.filter(user => user.role === roleFilter)
    }
    if (statusFilter !== 'all') {
      result = result.filter(user => (user.status || 'active') === statusFilter)
    }
    if (departmentFilter !== 'all') {
      result = result.filter(user => user.department === departmentFilter)
    }
    if (lastActiveFilter !== 'all') {
      const now = new Date()
      result = result.filter(user => {
        if (!user.lastLogin) return lastActiveFilter === 'never'
        const lastLogin = new Date(user.lastLogin)
        const days = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24))
        
        switch (lastActiveFilter) {
          case 'today': return days === 0
          case 'week': return days <= 7
          case 'month': return days <= 30
          case 'older': return days > 30
          default: return true
        }
      })
    }
    
    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc': return a.name.localeCompare(b.name)
        case 'name-desc': return b.name.localeCompare(a.name)
        case 'date-asc': return (new Date(a.createdAt || 0).getTime()) - (new Date(b.createdAt || 0).getTime())
        case 'date-desc': return (new Date(b.createdAt || 0).getTime()) - (new Date(a.createdAt || 0).getTime())
        case 'last-active': return (new Date(b.lastLogin || 0).getTime()) - (new Date(a.lastLogin || 0).getTime())
        default: return 0
      }
    })
    
    return result
  }, [localUsers, debouncedSearch, roleFilter, statusFilter, departmentFilter, lastActiveFilter, sortBy])
  
  // Handlers
  const handleSelectAll = useCallback(() => {
    if (selectedMembers.size === filteredUsers.length) {
      setSelectedMembers(new Set())
    } else {
      setSelectedMembers(new Set(filteredUsers.map(u => u.id)))
    }
  }, [filteredUsers, selectedMembers])
  
  const handleSelectMember = useCallback((id: string) => {
    const newSelected = new Set(selectedMembers)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedMembers(newSelected)
  }, [selectedMembers])
  
  const handleBulkAction = useCallback((action: string) => {
    const selectedIds = Array.from(selectedMembers)
    
    switch (action) {
      case 'role':
        toast.info(`Change role for ${selectedIds.length} members`)
        break
      case 'department':
        toast.info(`Assign department to ${selectedIds.length} members`)
        break
      case 'activate':
        setLocalUsers(prev => prev.map(u => 
          selectedIds.includes(u.id) ? { ...u, status: 'active' as MemberStatus } : u
        ))
        toast.success(`Activated ${selectedIds.length} members`)
        setSelectedMembers(new Set())
        break
      case 'deactivate':
        setLocalUsers(prev => prev.map(u => 
          selectedIds.includes(u.id) ? { ...u, status: 'inactive' as MemberStatus } : u
        ))
        toast.success(`Deactivated ${selectedIds.length} members`)
        setSelectedMembers(new Set())
        break
      case 'delete':
        setShowBulkDeleteConfirm(true)
        break
    }
  }, [selectedMembers])
  
  const handleDeleteUser = useCallback(() => {
    if (deletingUser) {
      setLocalUsers(prev => prev.filter(u => u.id !== deletingUser.id))
      toast.success(`${deletingUser.name} has been removed`)
      setDeletingUser(null)
      setShowDeleteConfirm(false)
    }
  }, [deletingUser])
  
  const handleBulkDelete = useCallback(() => {
    setLocalUsers(prev => prev.filter(u => !selectedMembers.has(u.id)))
    toast.success(`${selectedMembers.size} members have been removed`)
    setSelectedMembers(new Set())
    setShowBulkDeleteConfirm(false)
  }, [selectedMembers])
  
  const handleSaveUser = useCallback((updatedUser: User) => {
    setLocalUsers(prev => prev.map(u => 
      u.id === updatedUser.id ? updatedUser : u
    ))
    toast.success(`${updatedUser.name}'s profile has been updated`)
    setEditingUser(null)
  }, [])
  
  const handleToggleStatus = useCallback((user: User) => {
    const newStatus: MemberStatus = user.status === 'active' ? 'inactive' : 'active'
    setLocalUsers(prev => prev.map(u => 
      u.id === user.id ? { ...u, status: newStatus } : u
    ))
    toast.success(`${user.name} is now ${newStatus}`)
  }, [])
  
  const roleColors = {
    super_admin: 'destructive',
    admin: 'default',
    board_member: 'secondary',
    guest: 'outline'
  } as const
  
  const hasActiveFilters = roleFilter !== 'all' || statusFilter !== 'all' || 
    departmentFilter !== 'all' || lastActiveFilter !== 'all'
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Members</h1>
          <p className="text-muted-foreground mt-1">
            Manage board members and directory • {filteredUsers.length} of {localUsers.length} members
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowImportExport(true)}>
            <Download className="h-4 w-4 mr-1" />
            Import/Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowRoleManagement(true)}>
            <Shield className="h-4 w-4 mr-1" />
            Roles
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowAuditLog(true)}>
            <FileText className="h-4 w-4 mr-1" />
            Audit Log
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Invite New Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to join the board
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="john@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="board_member">Board Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="guest">Guest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Input id="position" placeholder="e.g., Treasurer" />
                </div>
                <div className="flex gap-2 justify-end pt-4">
                  <Button variant="outline">Cancel</Button>
                  <Button>Send Invitation</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card className="glass">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="board_member">Board Member</SelectItem>
                <SelectItem value="guest">Guest</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="pending_invite">Pending Invite</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={lastActiveFilter} onValueChange={setLastActiveFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Last Active" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Past Week</SelectItem>
                <SelectItem value="month">Past Month</SelectItem>
                <SelectItem value="older">Older</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Name A-Z</SelectItem>
                <SelectItem value="name-desc">Name Z-A</SelectItem>
                <SelectItem value="date-desc">Newest First</SelectItem>
                <SelectItem value="date-asc">Oldest First</SelectItem>
                <SelectItem value="last-active">Last Active</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button
                size="icon"
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                className="h-8 w-8"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                className="h-8 w-8"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setRoleFilter('all')
                  setStatusFilter('all')
                  setDepartmentFilter('all')
                  setLastActiveFilter('all')
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>
          
          {/* Selection bar */}
          {filteredUsers.length > 0 && (
            <div className="mt-4 pt-4 border-t flex items-center gap-2">
              <Checkbox
                checked={selectedMembers.size === filteredUsers.length && filteredUsers.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm">
                {selectedMembers.size > 0 
                  ? `${selectedMembers.size} of ${filteredUsers.length} selected`
                  : `Select all (${filteredUsers.length})`
                }
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <MemberCardSkeleton key={i} />
          ))}
        </div>
      )}
      
      {/* Members Grid/List */}
      {!isLoading && viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="glass hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="relative">
                    <Avatar className="h-24 w-24 ring-4 ring-background">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback className="text-2xl">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    {/* Quick status toggle */}
                    {user.status && user.status !== 'pending_invite' && (
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-background ${
                          user.status === 'active' ? 'bg-green-500' : 
                          user.status === 'inactive' ? 'bg-gray-500' : 'bg-red-500'
                        }`}
                        title={`Status: ${user.status}`}
                      />
                    )}
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg">{user.name}</h3>
                    <p className="text-sm text-muted-foreground">{user.position}</p>
                    <div className="flex items-center justify-center gap-2">
                      <Badge variant={roleColors[user.role]} className="text-xs">
                        {user.role.replace('_', ' ').toUpperCase()}
                      </Badge>
                      {user.status && <StatusBadge status={user.status} />}
                    </div>
                  </div>

                  <div className="w-full space-y-2 pt-2 border-t border-border">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4 shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4 shrink-0" />
                        <span>{user.phone}</span>
                      </div>
                    )}
                    {user.department && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building className="h-4 w-4 shrink-0" />
                        <span>{user.department}</span>
                      </div>
                    )}
                  </div>

                  {/* Security indicators */}
                  <div className="w-full pt-2 border-t flex items-center justify-center gap-3 text-xs text-muted-foreground">
                    {user.twoFactorEnabled && (
                      <span className="flex items-center gap-1 text-green-600">
                        <Shield className="h-3 w-3" /> 2FA
                      </span>
                    )}
                    {user.lastLogin && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> 
                        {new Date(user.lastLogin).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="w-full flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setActivityUser(user)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <MemberActionMenu
                      user={user}
                      onEdit={() => { setEditingUser(user); setShowEditModal(true) }}
                      onChangeRole={() => toast.info('Change role')}
                      onResetPassword={() => toast.success('Password reset sent')}
                      onSuspend={() => handleToggleStatus(user)}
                      onRemove={() => { setDeletingUser(user); setShowDeleteConfirm(true) }}
                      onViewActivity={() => setActivityUser(user)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* List View */}
      {!isLoading && viewMode === 'list' && (
        <Card className="glass">
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={selectedMembers.has(user.id)}
                      onCheckedChange={() => handleSelectMember(user.id)}
                    />
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{user.name}</h3>
                        <Badge variant={roleColors[user.role]} className="text-xs">
                          {user.role.replace('_', ' ').toUpperCase()}
                        </Badge>
                        {user.status && <StatusBadge status={user.status} />}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{user.position}</p>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5" />
                          <span>{user.email}</span>
                        </div>
                        {user.department && (
                          <div className="flex items-center gap-1.5">
                            <Building className="h-3.5 w-3.5" />
                            <span>{user.department}</span>
                          </div>
                        )}
                        {user.twoFactorEnabled && (
                          <span className="flex items-center gap-1 text-green-600">
                            <Shield className="h-3.5 w-3.5" /> 2FA
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setActivityUser(user)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <MemberActionMenu
                        user={user}
                        onEdit={() => { setEditingUser(user); setShowEditModal(true) }}
                        onChangeRole={() => toast.info('Change role')}
                        onResetPassword={() => toast.success('Password reset sent')}
                        onSuspend={() => handleToggleStatus(user)}
                        onRemove={() => { setDeletingUser(user); setShowDeleteConfirm(true) }}
                        onViewActivity={() => setActivityUser(user)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && filteredUsers.length === 0 && (
        <Card className="glass">
          <CardContent className="p-12">
            <div className="text-center text-muted-foreground">
              <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No members found</p>
              <p className="text-sm mt-1 mb-4">
                {hasActiveFilters 
                  ? 'Try adjusting your search or filters'
                  : 'Invite members to get started'
                }
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={() => {
                  setRoleFilter('all')
                  setStatusFilter('all')
                  setDepartmentFilter('all')
                  setLastActiveFilter('all')
                  setSearchQuery('')
                }}>
                  Clear all filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Bulk Action Bar */}
      {selectedMembers.size > 0 && (
        <BulkActionBar
          selectedCount={selectedMembers.size}
          onClearSelection={() => setSelectedMembers(new Set())}
          onBulkAction={handleBulkAction}
        />
      )}
      
      {/* Modals */}
      <EditMemberModal
        user={editingUser}
        open={showEditModal}
        onOpenChange={(open) => { setShowEditModal(open); if (!open) setEditingUser(null) }}
        onSave={handleSaveUser}
      />
      
      <ActivityModal
        user={activityUser}
        open={!!activityUser}
        onOpenChange={(open) => { if (!open) setActivityUser(null) }}
      />
      
      <ConfirmationModal
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Remove Member"
        description={`Are you sure you want to remove ${deletingUser?.name}? This action cannot be undone.`}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={handleDeleteUser}
      />
      
      <ConfirmationModal
        open={showBulkDeleteConfirm}
        onOpenChange={setShowBulkDeleteConfirm}
        title="Remove Members"
        description={`Are you sure you want to remove ${selectedMembers.size} members? This action cannot be undone.`}
        confirmLabel="Remove All"
        variant="destructive"
        onConfirm={handleBulkDelete}
      />
      
      <AuditLogModal
        open={showAuditLog}
        onOpenChange={setShowAuditLog}
      />
      
      <ImportExportModal
        open={showImportExport}
        onOpenChange={setShowImportExport}
      />
      
      <RoleManagementModal
        open={showRoleManagement}
        onOpenChange={setShowRoleManagement}
      />
    </div>
  )
}
