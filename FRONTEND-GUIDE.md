# E-Board MIS - Frontend Development Guide

## 📋 Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Setup Instructions](#setup-instructions)
5. [Routing Structure](#routing-structure)
6. [Component Architecture](#component-architecture)
7. [State Management](#state-management)
8. [API Integration](#api-integration)
9. [Authentication Flow](#authentication-flow)
10. [Styling & UI](#styling--ui)
11. [Forms & Validation](#forms--validation)
12. [Testing](#testing)
13. [Best Practices](#best-practices)

---

## 🎯 Overview

The E-Board MIS frontend is built with **TanStack Start**, a modern full-stack React framework that provides file-based routing, server-side rendering, and excellent developer experience. The application uses TypeScript for type safety and implements a component-based architecture.

### Key Features

- **File-based routing** with TanStack Router
- **Server-side rendering** (SSR) support
- **Type-safe API calls** with TanStack Query
- **Form management** with React Hook Form
- **Real-time updates** with WebSocket integration
- **Responsive design** with Tailwind CSS
- **Component library** with shadcn/ui
- **Dark mode** support
- **Internationalization** ready

---

## 🛠️ Technology Stack

| Technology            | Version | Purpose                 |
| --------------------- | ------- | ----------------------- |
| React                 | 18.x    | UI library              |
| TanStack Start        | Latest  | Full-stack framework    |
| TypeScript            | 5.x     | Type safety             |
| TanStack Router       | Latest  | File-based routing      |
| TanStack Query        | 5.x     | Data fetching & caching |
| React Hook Form       | 7.x     | Form management         |
| Zod                   | 3.x     | Schema validation       |
| Tailwind CSS          | 3.x     | Utility-first CSS       |
| shadcn/ui             | Latest  | Component library       |
| Axios                 | 1.x     | HTTP client             |
| Socket.io Client      | 4.x     | Real-time communication |
| date-fns              | 3.x     | Date manipulation       |
| Lucide React          | Latest  | Icon library            |
| Vitest                | Latest  | Unit testing            |
| React Testing Library | Latest  | Component testing       |

---

## 📁 Project Structure

```
frontend/
├── app/                                # Application code
│   ├── routes/                        # Route components (file-based routing)
│   │   ├── __root.tsx                # Root layout
│   │   ├── index.tsx                 # Home page (/)
│   │   ├── login.tsx                 # Login page (/login)
│   │   ├── register.tsx              # Register page (/register)
│   │   │
│   │   ├── dashboard/                # Dashboard routes
│   │   │   └── index.tsx            # /dashboard
│   │   │
│   │   ├── meetings/                 # Meetings routes
│   │   │   ├── index.tsx            # /meetings (list)
│   │   │   ├── $id.tsx              # /meetings/:id (detail)
│   │   │   ├── create.tsx           # /meetings/create
│   │   │   └── $id.edit.tsx         # /meetings/:id/edit
│   │   │
│   │   ├── documents/                # Documents routes
│   │   │   ├── index.tsx            # /documents
│   │   │   └── $id.tsx              # /documents/:id
│   │   │
│   │   ├── resolutions/              # Resolutions routes
│   │   │   ├── index.tsx            # /resolutions
│   │   │   └── $id.tsx              # /resolutions/:id
│   │   │
│   │   ├── organizations/            # Organizations routes
│   │   │   ├── index.tsx            # /organizations
│   │   │   ├── $id.tsx              # /organizations/:id
│   │   │   └── create.tsx           # /organizations/create
│   │   │
│   │   └── profile/                  # Profile routes
│   │       └── index.tsx            # /profile
│   │
│   ├── components/                   # React components
│   │   ├── auth/                    # Authentication components
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── AuthProvider.tsx
│   │   │
│   │   ├── common/                  # Common/shared components
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Layout.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── DataTable.tsx
│   │   │   ├── Pagination.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   └── ConfirmDialog.tsx
│   │   │
│   │   ├── meetings/                # Meeting components
│   │   │   ├── MeetingCard.tsx
│   │   │   ├── MeetingForm.tsx
│   │   │   ├── MeetingList.tsx
│   │   │   ├── MeetingDetail.tsx
│   │   │   ├── AgendaList.tsx
│   │   │   ├── AgendaItem.tsx
│   │   │   ├── MinutesEditor.tsx
│   │   │   └── AttendeeList.tsx
│   │   │
│   │   ├── documents/               # Document components
│   │   │   ├── DocumentUpload.tsx
│   │   │   ├── DocumentList.tsx
│   │   │   ├── DocumentCard.tsx
│   │   │   ├── DocumentViewer.tsx
│   │   │   └── FileDropzone.tsx
│   │   │
│   │   ├── resolutions/             # Resolution components
│   │   │   ├── ResolutionCard.tsx
│   │   │   ├── ResolutionForm.tsx
│   │   │   ├── VotingPanel.tsx
│   │   │   ├── VoteResults.tsx
│   │   │   └── VoteChart.tsx
│   │   │
│   │   ├── notifications/           # Notification components
│   │   │   ├── NotificationBell.tsx
│   │   │   ├── NotificationList.tsx
│   │   │   └── NotificationItem.tsx
│   │   │
│   │   └── ui/                      # shadcn/ui components
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── form.tsx
│   │       ├── table.tsx
│   │       └── ... (other UI components)
│   │
│   ├── hooks/                       # Custom React hooks
│   │   ├── useAuth.ts              # Authentication hook
│   │   ├── useMeetings.ts          # Meetings data hook
│   │   ├── useDocuments.ts         # Documents data hook
│   │   ├── useResolutions.ts       # Resolutions data hook
│   │   ├── useNotifications.ts     # Notifications hook
│   │   ├── useWebSocket.ts         # WebSocket connection hook
│   │   ├── useLocalStorage.ts      # Local storage hook
│   │   ├── useDebounce.ts          # Debounce hook
│   │   └── useMediaQuery.ts        # Responsive design hook
│   │
│   ├── services/                    # API service layer
│   │   ├── api.ts                  # Base API client
│   │   ├── auth.service.ts         # Auth API calls
│   │   ├── users.service.ts        # Users API calls
│   │   ├── meetings.service.ts     # Meetings API calls
│   │   ├── documents.service.ts    # Documents API calls
│   │   ├── resolutions.service.ts  # Resolutions API calls
│   │   ├── notifications.service.ts # Notifications API calls
│   │   └── websocket.service.ts    # WebSocket service
│   │
│   ├── utils/                       # Utility functions
│   │   ├── formatDate.ts           # Date formatting
│   │   ├── formatCurrency.ts       # Currency formatting
│   │   ├── storage.ts              # Storage helpers
│   │   ├── validation.ts           # Validation helpers
│   │   ├── constants.ts            # App constants
│   │   └── helpers.ts              # General helpers
│   │
│   ├── types/                       # TypeScript types
│   │   ├── user.types.ts           # User types
│   │   ├── meeting.types.ts        # Meeting types
│   │   ├── document.types.ts       # Document types
│   │   ├── resolution.types.ts     # Resolution types
│   │   ├── api.types.ts            # API response types
│   │   └── common.types.ts         # Common types
│   │
│   ├── styles/                      # Global styles
│   │   ├── globals.css             # Global CSS
│   │   └── tailwind.css            # Tailwind imports
│   │
│   ├── lib/                         # Library configurations
│   │   ├── queryClient.ts          # TanStack Query config
│   │   └── axios.ts                # Axios config
│   │
│   ├── contexts/                    # React contexts
│   │   ├── AuthContext.tsx
│   │   ├── ThemeContext.tsx
│   │   └── NotificationContext.tsx
│   │
│   └── router.tsx                   # Router configuration
│
├── public/                          # Static assets
│   ├── assets/
│   │   ├── images/
│   │   │   ├── logo.svg
│   │   │   └── placeholder.png
│   │   └── icons/
│   │       └── favicon.ico
│   └── robots.txt
│
├── tests/                           # Test files
│   ├── components/                 # Component tests
│   ├── hooks/                      # Hook tests
│   ├── utils/                      # Utility tests
│   └── setup.ts                    # Test setup
│
├── .env.example                     # Environment template
├── .eslintrc.js                     # ESLint configuration
├── .prettierrc                      # Prettier configuration
├── tailwind.config.ts               # Tailwind configuration
├── postcss.config.js                # PostCSS configuration
├── vite.config.ts                   # Vite configuration
├── tsconfig.json                    # TypeScript configuration
├── package.json                     # Dependencies
├── vitest.config.ts                 # Vitest configuration
└── README.md                        # Documentation
```

---

## 🚀 Setup Instructions

### Prerequisites

- Node.js v18+ installed
- npm or pnpm package manager
- Backend API running (see Backend Guide)

### Step-by-Step Setup

#### 1. Create TanStack Start Project

```bash
# Create new project
npm create @tanstack/start@latest frontend

# Choose TypeScript
cd frontend
```

#### 2. Install Dependencies

```bash
# Core dependencies (usually pre-installed)
npm install react react-dom @tanstack/react-router @tanstack/react-query

# HTTP Client
npm install axios

# Form Management
npm install react-hook-form @hookform/resolvers zod

# UI Framework
npm install tailwindcss postcss autoprefixer
npx tailwindcss init -p

# shadcn/ui
npx shadcn-ui@latest init

# Icons
npm install lucide-react

# Date utilities
npm install date-fns

# WebSocket
npm install socket.io-client

# State Management (if needed)
npm install zustand

# Dev dependencies
npm install -D @types/node @types/react @types/react-dom
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D eslint prettier eslint-config-prettier
```

#### 3. Setup Environment Variables

Create `.env` file:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_API_TIMEOUT=30000

# Application
VITE_APP_NAME=E-Board MIS
VITE_APP_VERSION=1.0.0

# Authentication
VITE_TOKEN_KEY=eboard_access_token
VITE_REFRESH_TOKEN_KEY=eboard_refresh_token

# File Upload
VITE_MAX_FILE_SIZE=10485760
VITE_ALLOWED_FILE_TYPES=.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx

# WebSocket
VITE_WS_URL=http://localhost:3000

# Feature Flags
VITE_ENABLE_DARK_MODE=true
VITE_ENABLE_NOTIFICATIONS=true
```

#### 4. Configure Tailwind CSS

Edit `tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

#### 5. Start Development Server

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

Frontend will be available at: `http://localhost:3001`

---

## 🛣️ Routing Structure

### File-Based Routing

TanStack Router uses file-based routing. File names map to URLs:

```typescript
app/routes/
├── __root.tsx              # Layout for all routes
├── index.tsx               # / (home)
├── login.tsx               # /login
├── dashboard/
│   └── index.tsx          # /dashboard
├── meetings/
│   ├── index.tsx          # /meetings
│   ├── $id.tsx            # /meetings/:id (dynamic)
│   └── create.tsx         # /meetings/create
```

### Root Layout Example

```typescript
// app/routes/__root.tsx
import { Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { Header } from "@/components/common/Header";
import { Sidebar } from "@/components/common/Sidebar";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

export function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1">
            <Header />
            <main className="container mx-auto p-6">
              <Outlet />
            </main>
          </div>
        </div>
        <TanStackRouterDevtools />
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

### Protected Route Example

```typescript
// app/routes/dashboard/index.tsx
import { createFileRoute, redirect } from "@tanstack/react-router";
import { DashboardView } from "@/components/dashboard/DashboardView";

export const Route = createFileRoute("/dashboard/")({
  beforeLoad: async ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: "/login",
        search: {
          redirect: "/dashboard",
        },
      });
    }
  },
  component: DashboardView,
});
```

### Dynamic Route Example

```typescript
// app/routes/meetings/$id.tsx
import { createFileRoute } from "@tanstack/react-router";
import { MeetingDetail } from "@/components/meetings/MeetingDetail";
import { getMeetingById } from "@/services/meetings.service";

export const Route = createFileRoute("/meetings/$id")({
  loader: async ({ params }) => {
    return await getMeetingById(params.id);
  },
  component: MeetingDetailPage,
});

function MeetingDetailPage() {
  const meeting = Route.useLoaderData();
  return <MeetingDetail meeting={meeting} />;
}
```

---

## 🧩 Component Architecture

### Component Structure

```typescript
// components/meetings/MeetingCard.tsx
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/utils/formatDate";
import { Meeting } from "@/types/meeting.types";
import { Calendar, MapPin, Users } from "lucide-react";

interface MeetingCardProps {
  meeting: Meeting;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function MeetingCard({
  meeting,
  onView,
  onEdit,
  onDelete,
}: MeetingCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <h3 className="text-xl font-semibold">{meeting.title}</h3>
        <span className={`badge badge-${meeting.status.toLowerCase()}`}>
          {meeting.status}
        </span>
      </CardHeader>

      <CardContent>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(meeting.meetingDate)}</span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>{meeting.location || "Virtual"}</span>
          </div>

          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>{meeting.attendees?.length || 0} Attendees</span>
          </div>
        </div>

        <p className="mt-3 text-gray-700 line-clamp-2">{meeting.description}</p>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button onClick={() => onView?.(meeting.id)} variant="default">
          View Details
        </Button>
        <Button onClick={() => onEdit?.(meeting.id)} variant="outline">
          Edit
        </Button>
        <Button onClick={() => onDelete?.(meeting.id)} variant="destructive">
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
}
```

### Form Component Example

```typescript
// components/meetings/MeetingForm.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const meetingSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  meetingDate: z.string(),
  startTime: z.string(),
  endTime: z.string().optional(),
  location: z.string().optional(),
  meetingLink: z.string().url().optional().or(z.literal("")),
});

type MeetingFormData = z.infer<typeof meetingSchema>;

interface MeetingFormProps {
  initialData?: Partial<MeetingFormData>;
  onSubmit: (data: MeetingFormData) => Promise<void>;
  onCancel?: () => void;
}

export function MeetingForm({
  initialData,
  onSubmit,
  onCancel,
}: MeetingFormProps) {
  const form = useForm<MeetingFormData>({
    resolver: zodResolver(meetingSchema),
    defaultValues: initialData || {
      title: "",
      description: "",
      meetingDate: "",
      startTime: "",
      endTime: "",
      location: "",
      meetingLink: "",
    },
  });

  const handleSubmit = async (data: MeetingFormData) => {
    try {
      await onSubmit(data);
      form.reset();
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Meeting Title *</FormLabel>
              <FormControl>
                <Input placeholder="Board Meeting Q4 2025" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Meeting agenda and objectives..."
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="meetingDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time *</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input placeholder="Conference Room A" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="meetingLink"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Virtual Meeting Link</FormLabel>
              <FormControl>
                <Input
                  type="url"
                  placeholder="https://zoom.us/j/..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : "Save Meeting"}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
```

---

## 📊 State Management

### TanStack Query for Server State

```typescript
// hooks/useMeetings.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMeetings,
  getMeetingById,
  createMeeting,
  updateMeeting,
  deleteMeeting,
} from "@/services/meetings.service";
import { Meeting, CreateMeetingDto } from "@/types/meeting.types";

export function useMeetings(page = 1, limit = 10) {
  return useQuery({
    queryKey: ["meetings", page, limit],
    queryFn: () => getMeetings({ page, limit }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useMeeting(id: string) {
  return useQuery({
    queryKey: ["meetings", id],
    queryFn: () => getMeetingById(id),
    enabled: !!id,
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMeetingDto) => createMeeting(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    },
  });
}

export function useUpdateMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Meeting> }) =>
      updateMeeting(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["meetings", variables.id] });
    },
  });
}

export function useDeleteMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteMeeting(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    },
  });
}
```

### Using the Hooks in Components

```typescript
// routes/meetings/index.tsx
import { useMeetings, useDeleteMeeting } from "@/hooks/useMeetings";
import { MeetingCard } from "@/components/meetings/MeetingCard";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export function MeetingsListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useMeetings(page, 10);
  const deleteMutation = useDeleteMeeting();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div>Error loading meetings</div>;

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this meeting?")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Meetings</h1>
        <Button onClick={() => navigate({ to: "/meetings/create" })}>
          Create Meeting
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data?.data.map((meeting) => (
          <MeetingCard
            key={meeting.id}
            meeting={meeting}
            onView={(id) => navigate({ to: "/meetings/$id", params: { id } })}
            onEdit={(id) =>
              navigate({ to: "/meetings/$id/edit", params: { id } })
            }
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-center gap-2">
        <Button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </Button>
        <span className="py-2 px-4">Page {page}</span>
        <Button
          onClick={() => setPage((p) => p + 1)}
          disabled={!data?.meta || page >= data.meta.totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
```

---

## 🌐 API Integration

### API Client Setup

```typescript
// services/api.ts
import axios from "axios";
import { getToken, clearTokens } from "@/utils/storage";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const newToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        clearTokens();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error.response?.data || error.message);
  }
);

export default api;
```

### Service Layer Example

```typescript
// services/meetings.service.ts
import api from "./api";
import {
  Meeting,
  CreateMeetingDto,
  UpdateMeetingDto,
} from "@/types/meeting.types";
import { PaginatedResponse } from "@/types/api.types";

export async function getMeetings(params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<PaginatedResponse<Meeting>> {
  return api.get("/meetings", { params });
}

export async function getMeetingById(id: string): Promise<Meeting> {
  return api.get(`/meetings/${id}`);
}

export async function createMeeting(data: CreateMeetingDto): Promise<Meeting> {
  return api.post("/meetings", data);
}

export async function updateMeeting(
  id: string,
  data: UpdateMeetingDto
): Promise<Meeting> {
  return api.patch(`/meetings/${id}`, data);
}

export async function deleteMeeting(id: string): Promise<void> {
  return api.delete(`/meetings/${id}`);
}

export async function publishMeeting(id: string): Promise<Meeting> {
  return api.post(`/meetings/${id}/publish`);
}

export async function getMeetingAgenda(meetingId: string) {
  return api.get(`/meetings/${meetingId}/agenda`);
}

export async function addAgendaItem(meetingId: string, data: any) {
  return api.post(`/meetings/${meetingId}/agenda`, data);
}
```

---

## 🔐 Authentication Flow

### Auth Context

```typescript
// contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from "react";
import { User } from "@/types/user.types";
import { getToken, setToken, clearTokens } from "@/utils/storage";
import {
  login as apiLogin,
  logout as apiLogout,
  getCurrentUser,
} from "@/services/auth.service";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = getToken();
      if (token) {
        try {
          const currentUser = await getCurrentUser();
          setUser(currentUser);
        } catch (error) {
          clearTokens();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await apiLogin({ email, password });
    setToken(response.accessToken);
    setUser(response.user);
  };

  const logout = async () => {
    await apiLogout();
    clearTokens();
    setUser(null);
  };

  const refreshUser = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
```

### Protected Route Component

```typescript
// components/auth/ProtectedRoute.tsx
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "@tanstack/react-router";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export function ProtectedRoute({
  children,
  requiredRoles,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" search={{ redirect: location.pathname }} />;
  }

  if (requiredRoles && !requiredRoles.includes(user?.role || "")) {
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
}
```

---

## 🧪 Testing

### Component Test Example

```typescript
// components/meetings/__tests__/MeetingCard.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MeetingCard } from "../MeetingCard";

const mockMeeting = {
  id: "1",
  title: "Board Meeting",
  description: "Q4 planning",
  meetingDate: "2025-12-01",
  location: "Conference Room A",
  status: "SCHEDULED",
  attendees: [],
};

describe("MeetingCard", () => {
  it("renders meeting information correctly", () => {
    render(<MeetingCard meeting={mockMeeting} />);

    expect(screen.getByText("Board Meeting")).toBeInTheDocument();
    expect(screen.getByText("Q4 planning")).toBeInTheDocument();
    expect(screen.getByText("SCHEDULED")).toBeInTheDocument();
  });

  it("calls onView when View Details button is clicked", () => {
    const handleView = vi.fn();
    render(<MeetingCard meeting={mockMeeting} onView={handleView} />);

    fireEvent.click(screen.getByText("View Details"));
    expect(handleView).toHaveBeenCalledWith("1");
  });
});
```

### Hook Test Example

```typescript
// hooks/__tests__/useAuth.test.ts
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useAuth } from "../useAuth";

describe("useAuth", () => {
  it("should login successfully", async () => {
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      result.current.login("test@example.com", "password");
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toBeDefined();
  });
});
```

### Run Tests

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

---

## ✨ Best Practices

### 1. Component Design

- Keep components small and focused
- Use TypeScript for type safety
- Implement proper error boundaries
- Use memoization when necessary (useMemo, useCallback)

### 2. State Management

- Use TanStack Query for server state
- Use local state for UI-only state
- Avoid prop drilling with context
- Keep state as close to usage as possible

### 3. Performance

- Lazy load routes and components
- Optimize images and assets
- Implement virtual scrolling for long lists
- Use React.memo for expensive components

### 4. Accessibility

- Use semantic HTML
- Add proper ARIA labels
- Ensure keyboard navigation
- Test with screen readers

### 5. Code Organization

- Group files by feature
- Use absolute imports (@/components)
- Keep utilities separate
- Follow naming conventions

### 6. Testing

- Test user interactions
- Test error states
- Mock external dependencies
- Aim for >80% coverage

---

## 📚 Additional Resources

- [TanStack Start Documentation](https://tanstack.com/start)
- [TanStack Query Documentation](https://tanstack.com/query)
- [TanStack Router Documentation](https://tanstack.com/router)
- [React Hook Form Documentation](https://react-hook-form.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [shadcn/ui Documentation](https://ui.shadcn.com/)

---

**Last Updated**: November 2025
**Version**: 1.0.0
**Maintainer**: Frontend Team
