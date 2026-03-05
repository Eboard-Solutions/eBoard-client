// pages/Profile.tsx - Complete Profile Page for EBoard MIS

'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  MapPin,
  Calendar,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Camera,
  Save,
  X,
  Loader2,
  Clock,
} from 'lucide-react';

import { usePermissions } from '@/lib/permissions';
import authService from '@/lib/auth';

// ── Types ──────────────────────────────────────────
interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  title?: string;
  role: string;
  profilePictureUrl?: string;
  bio?: string;
  address?: string;
  city?: string;
  country?: string;
  timezone?: string;
  organizationId?: string;
  orgCode?: string;
  organization?: {
    id: string;
    organisationName: string;
    email?: string;
    phoneNumber?: string;
    address?: string;
    logoUrl?: string;
  };
  committees?: string[];
  joinedAt?: string;
  lastLogin?: string;
}

interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  title?: string;
  bio?: string;
  address?: string;
  city?: string;
  country?: string;
  timezone?: string;
}

interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// ── API Functions ──────────────────────────────────
async function fetchProfile(): Promise<UserProfile> {
  const response = await fetch('/api/v1/auth/me', {
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${authService.getToken()}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch profile');
  }

  const data = await response.json();
  return data;
}

async function updateProfile(data: UpdateProfileDto): Promise<UserProfile> {
  const response = await fetch('/api/v1/users/profile', {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authService.getToken()}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update profile' }));
    throw new Error(error.message);
  }

  return response.json();
}

async function changePassword(data: ChangePasswordDto): Promise<void> {
  const response = await fetch('/api/v1/auth/change-password', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authService.getToken()}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to change password' }));
    throw new Error(error.message);
  }
}

async function uploadProfilePicture(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/v1/users/profile/avatar', {
    method: 'POST',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${authService.getToken()}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to upload image' }));
    throw new Error(error.message);
  }

  return response.json();
}

// ── Main Component ─────────────────────────────────
export default function Profile() {
  const queryClient = useQueryClient();
  // Auth permissions available if needed: const { user: authUser, isSuperAdmin, isOrgAdmin } = usePermissions();
  usePermissions(); // Ensures auth is initialized

  // State
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form state
  const [formData, setFormData] = useState<UpdateProfileDto>({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    title: '',
    bio: '',
    address: '',
    city: '',
    country: '',
    timezone: '',
  });

  // Password form state
  const [passwordData, setPasswordData] = useState<ChangePasswordDto>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Queries
  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ['profile'],
    queryFn: fetchProfile,
  });

  // Mutations
  const updateMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Profile updated successfully');
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update profile');
    },
  });

  const passwordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      toast.success('Password changed successfully');
      setShowPasswordDialog(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to change password');
    },
  });

  const avatarMutation = useMutation({
    mutationFn: uploadProfilePicture,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Profile picture updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to upload image');
    },
  });

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        phoneNumber: profile.phoneNumber || '',
        title: profile.title || '',
        bio: profile.bio || '',
        address: profile.address || '',
        city: profile.city || '',
        country: profile.country || '',
        timezone: profile.timezone || '',
      });
    }
  }, [profile]);

  // Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      avatarMutation.mutate(file);
    }
  };

  const handleUpdateProfile = () => {
    updateMutation.mutate(formData);
  };

  const handleCancelEdit = () => {
    if (profile) {
      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        phoneNumber: profile.phoneNumber || '',
        title: profile.title || '',
        bio: profile.bio || '',
        address: profile.address || '',
        city: profile.city || '',
        country: profile.country || '',
        timezone: profile.timezone || '',
      });
    }
    setIsEditing(false);
  };

  const handleChangePassword = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    passwordMutation.mutate(passwordData);
  };

  const getRoleColor = (role: string) => {
    const normalized = role.toLowerCase();
    if (normalized.includes('super')) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (normalized.includes('admin')) return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    if (normalized.includes('board')) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getRoleIcon = (role: string) => {
    const normalized = role.toLowerCase();
    if (normalized.includes('super')) return Shield;
    if (normalized.includes('admin')) return Briefcase;
    return User;
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <p className="text-muted-foreground">Failed to load profile</p>
      </div>
    );
  }

  const RoleIcon = getRoleIcon(profile.role);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-blue-50/20 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Profile</h1>
            <p className="text-slate-600 mt-1">Manage your personal information and settings</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Sidebar - Profile Card */}
          <div className="lg:col-span-1 space-y-6">
            {/* Avatar & Basic Info */}
            <Card className="border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-xl">
              <CardContent className="pt-8 pb-6">
                <div className="flex flex-col items-center text-center">
                  {/* Avatar */}
                  <div className="relative group">
                    <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                      <AvatarImage src={profile.profilePictureUrl} alt={profile.firstName} />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-600 to-blue-600 text-white text-3xl font-semibold">
                        {getInitials(profile.firstName, profile.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Camera className="h-8 w-8 text-white" />
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={avatarMutation.isPending}
                      />
                    </label>
                    {avatarMutation.isPending && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                        <Loader2 className="h-8 w-8 text-white animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Name & Role */}
                  <h2 className="mt-6 text-2xl font-bold text-slate-900">
                    {profile.firstName} {profile.lastName}
                  </h2>
                  {profile.title && (
                    <p className="text-slate-600 font-medium mt-1">{profile.title}</p>
                  )}
                  <Badge className={`mt-3 px-4 py-1 ${getRoleColor(profile.role)}`}>
                    <RoleIcon className="h-3.5 w-3.5 mr-1.5" />
                    {profile.role}
                  </Badge>

                  <Separator className="my-6" />

                  {/* Quick Stats */}
                  <div className="w-full space-y-3 text-sm">
                    <div className="flex items-center text-slate-600">
                      <Mail className="h-4 w-4 mr-3 text-indigo-600" />
                      <span className="truncate">{profile.email}</span>
                    </div>
                    {profile.phoneNumber && (
                      <div className="flex items-center text-slate-600">
                        <Phone className="h-4 w-4 mr-3 text-indigo-600" />
                        <span>{profile.phoneNumber}</span>
                      </div>
                    )}
                    {profile.organization && (
                      <div className="flex items-center text-slate-600">
                        <Building2 className="h-4 w-4 mr-3 text-indigo-600" />
                        <span className="truncate">{profile.organization.organisationName}</span>
                      </div>
                    )}
                    {profile.joinedAt && (
                      <div className="flex items-center text-slate-600">
                        <Calendar className="h-4 w-4 mr-3 text-indigo-600" />
                        <span>Joined {formatDate(profile.joinedAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Organization Card */}
            {profile.organization && (
              <Card className="border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-indigo-600" />
                    Organization
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-slate-500 text-xs mb-1">Name</p>
                    <p className="font-semibold text-slate-900">
                      {profile.organization.organisationName}
                    </p>
                  </div>
                  {profile.orgCode && (
                    <div>
                      <p className="text-slate-500 text-xs mb-1">Organization Code</p>
                      <code className="px-2 py-1 bg-slate-100 rounded text-indigo-600 font-mono">
                        {profile.orgCode}
                      </code>
                    </div>
                  )}
                  {profile.organization.email && (
                    <div>
                      <p className="text-slate-500 text-xs mb-1">Contact Email</p>
                      <p className="text-slate-700">{profile.organization.email}</p>
                    </div>
                  )}
                  {profile.organization.phoneNumber && (
                    <div>
                      <p className="text-slate-500 text-xs mb-1">Contact Phone</p>
                      <p className="text-slate-700">{profile.organization.phoneNumber}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Content - Detailed Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <Card className="border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="text-xl">Personal Information</CardTitle>
                  <CardDescription>Update your personal details and information</CardDescription>
                </div>
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                    <User className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCancelEdit}
                      variant="outline"
                      size="sm"
                      disabled={updateMutation.isPending}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      onClick={handleUpdateProfile}
                      size="sm"
                      disabled={updateMutation.isPending}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      {updateMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Name Fields */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                      disabled={!isEditing}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                      disabled={!isEditing}
                      className="bg-white"
                    />
                  </div>
                </div>

                {/* Contact Fields */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, phoneNumber: e.target.value })
                      }
                      disabled={!isEditing}
                      placeholder="+254 712 345 678"
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">Job Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      disabled={!isEditing}
                      placeholder="e.g., Board Member, Secretary"
                      className="bg-white"
                    />
                  </div>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Tell us a bit about yourself..."
                    rows={4}
                    className="bg-white resize-none"
                  />
                  <p className="text-xs text-slate-500">
                    {formData.bio?.length || 0} / 500 characters
                  </p>
                </div>

                <Separator />

                {/* Location Fields */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-indigo-600" />
                    Location
                  </h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        disabled={!isEditing}
                        placeholder="e.g., Nairobi"
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={formData.country}
                        onChange={(e) =>
                          setFormData({ ...formData, country: e.target.value })
                        }
                        disabled={!isEditing}
                        placeholder="e.g., Kenya"
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Input
                        id="timezone"
                        value={formData.timezone}
                        onChange={(e) =>
                          setFormData({ ...formData, timezone: e.target.value })
                        }
                        disabled={!isEditing}
                        placeholder="e.g., EAT (UTC+3)"
                        className="bg-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      disabled={!isEditing}
                      placeholder="Street address"
                      className="bg-white"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card className="border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Lock className="h-5 w-5 text-indigo-600" />
                  Security
                </CardTitle>
                <CardDescription>Manage your password and security settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <p className="font-medium text-slate-900">Password</p>
                    <p className="text-sm text-slate-600 mt-1">
                      Last changed {profile.lastLogin ? formatDate(profile.lastLogin) : 'never'}
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowPasswordDialog(true)}
                    variant="outline"
                    size="sm"
                  >
                    Change Password
                  </Button>
                </div>

                {/* Additional Security Info */}
                {profile.lastLogin && (
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-slate-400" />
                      <div>
                        <p className="font-medium text-slate-900">Last Login</p>
                        <p className="text-sm text-slate-600 mt-1">
                          {formatDate(profile.lastLogin)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Committees (if applicable) */}
            {profile.committees && profile.committees.length > 0 && (
              <Card className="border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Committee Memberships</CardTitle>
                  <CardDescription>Committees you are part of</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profile.committees.map((committee, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border-indigo-200"
                      >
                        {committee}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Change Password Dialog */}
      <AlertDialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-indigo-600" />
              Change Password
            </AlertDialogTitle>
            <AlertDialogDescription>
              Enter your current password and choose a new one
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, currentPassword: e.target.value })
                  }
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, newPassword: e.target.value })
                  }
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500">Must be at least 8 characters</p>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                  }
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {passwordData.confirmPassword &&
                passwordData.newPassword !== passwordData.confirmPassword && (
                  <p className="text-xs text-red-600">Passwords do not match</p>
                )}
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={passwordMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleChangePassword}
              disabled={
                passwordMutation.isPending ||
                !passwordData.currentPassword ||
                !passwordData.newPassword ||
                passwordData.newPassword !== passwordData.confirmPassword
              }
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {passwordMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing...
                </>
              ) : (
                'Change Password'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}