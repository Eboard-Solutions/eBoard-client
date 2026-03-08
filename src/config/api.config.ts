// src/config/api.config.ts
// Centralized API configuration

export const API_CONFIG = {
  BASE_URL: `${import.meta.env.VITE_API_URL}/api/v1`,
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;

export const ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: '/auth/login',
    // /api/v1/auth/org-admin/login
    ORG_ADMIN_LOGIN: '/auth/org-admin/login',
    SUPER_ADMIN_LOGIN: '/auth/super-admin/login',
    REGISTER_ORG_ADMIN: '/auth/register/org-admin',
    LOGOUT: (userId: string) => `/auth/logout/${userId}`,
    REFRESH_TOKENS: '/auth/refresh-tokens',
    ME: '/auth/me',
    FORGOT_PASSWORD: '/auth/forgot-password',
    FORGOT_PASSWORD_SUPER_ADMIN: '/auth/forgot-password/super-admin',
    RESET_PASSWORD: '/auth/reset-password',
    CHANGE_PASSWORD: '/auth/change-password',
    ACTIVATE_ACCOUNT: '/auth/activate-account',
    DELETE_ACCOUNT: (id: string) => `/auth/delete-account/${id}`,
    INTROSPECT: '/auth/introspect',
  },

  // User endpoints
  USERS: {
    BASE: '/user',
    BY_ID: (userId: string) => `/user/${userId}`,
    ORGANISATION_USERS: '/user/organisation-users',
    SUPER_ADMIN: '/user/super-admin',
    ASSIGN_ROLE: (userId: string) => `/user/${userId}/assign-role`,
    CHANGE_ROLE: (userId: string) => `/user/${userId}/change-role`,
    TOGGLE_STATUS: (userId: string) => `/user/${userId}/toggle-status`,
    PERMISSIONS: (userId: string) => `/user/${userId}/permissions`,
  },

  // Admin endpoints
  ADMIN: {
    APPROVE_ORG: (id: string) => `/admin/organisations/${id}/approve`,
  },

  // Meetings endpoints
  MEETINGS: {
    BASE: '/meetings',
    BY_ID: (meetingId: string) => `/meetings/${meetingId}`,
    MY_MEETINGS: '/meetings/my-meetings',
    ADD_ATTENDEE: (meetingId: string) => `/meetings/${meetingId}/attendee`,
    REMOVE_ATTENDEE: (meetingId: string, userId: string) => `/meetings/${meetingId}/attendees/${userId}`,
    ATTENDEES: (meetingId: string) => `/meetings/${meetingId}/attendees`,
    ATTENDEE_STATS: (meetingId: string) => `/meetings/${meetingId}/attendee-stats`,
    RSVP: (meetingId: string) => `/meetings/${meetingId}/rsvp`,
    START: (meetingId: string) => `/meetings/${meetingId}/start`,
    COMPLETE: (meetingId: string) => `/meetings/${meetingId}/complete`,
    CANCEL: (meetingId: string) => `/meetings/${meetingId}/cancel`,
  },

  // Agenda endpoints
  AGENDAS: {
    BASE: '/agendas',
    BY_ID: (agendaId: string) => `/agendas/${agendaId}`,
    BY_MEETING: (meetingId: string) => `/agendas/meeting/${meetingId}`,
    PUBLISH: (agendaId: string) => `/agendas/${agendaId}/publish`,
    STATS: (agendaId: string) => `/agendas/${agendaId}/stats`,
    ITEMS: {
      ADD: (agendaId: string) => `/agendas/${agendaId}/items`,
      UPDATE: (agendaId: string, itemId: string) => `/agendas/${agendaId}/items/${itemId}`,
      DELETE: (agendaId: string, itemId: string) => `/agendas/${agendaId}/items/${itemId}`,
      REORDER: (agendaId: string) => `/agendas/${agendaId}/items/reorder`,
      START: (agendaId: string, itemId: string) => `/agendas/${agendaId}/items/${itemId}/start`,
      COMPLETE: (agendaId: string, itemId: string) => `/agendas/${agendaId}/items/${itemId}/complete`,
    },
  },

  // Minutes endpoints
  MINUTES: {
    BASE: '/minutes',
    BY_ID: (minutesId: string) => `/minutes/${minutesId}`,
    BY_MEETING: (meetingId: string) => `/minutes/meeting/${meetingId}`,
    APPROVE: (minutesId: string) => `/minutes/${minutesId}/approve`,
    PUBLISH: (minutesId: string) => `/minutes/${minutesId}/publish`,
    SUBMIT_REVIEW: (minutesId: string) => `/minutes/${minutesId}/submit-review`,
    ITEMS: {
      ADD: (minutesId: string) => `/minutes/${minutesId}/items`,
      UPDATE: (minutesId: string, itemId: string) => `/minutes/${minutesId}/items/${itemId}`,
      DELETE: (minutesId: string, itemId: string) => `/minutes/${minutesId}/items/${itemId}`,
      REORDER: (minutesId: string) => `/minutes/${minutesId}/items/reorder`,
    },
  },

  // Announcements endpoints
  ANNOUNCEMENTS: {
    BASE: '/announcements/get-all',
    BY_ID: (id: string) => `/announcements/${id}`,
    CREATE: '/announcements/create',
    UPDATE: (id: string) => `/announcements/update/${id}`,
    DELETE: (id: string) => `/announcements/delete/${id}`,
    BULK_DELETE: '/announcements/bulk-delete',
  },

  // Documents endpoints
  DOCUMENTS: {
    BASE: '/documents/get-all',
    BY_ID: (id: string) => `/documents/${id}`,
    CREATE: '/documents/create',
    UPDATE: (id: string) => `/documents/update/${id}`,
    DELETE: (id: string) => `/documents/delete/${id}`,
    BULK_DELETE: '/documents/bulk-delete',
  },

  // Notifications endpoints
  NOTIFICATIONS: {
    BASE: '/notifications/get-all',
    BY_ID: (id: string) => `/notifications/${id}`,
    CREATE: '/notifications/create',
    UPDATE: (id: string) => `/notifications/update/${id}`,
    DELETE: (id: string) => `/notifications/delete/${id}`,
    BULK_DELETE: '/notifications/bulk-delete',
  },

  // Polls endpoints
  POLLS: {
    BASE: '/polls/get-all',
    BY_ID: (id: string) => `/polls/${id}`,
    CREATE: '/polls/create',
    UPDATE: (id: string) => `/polls/update/${id}`,
    DELETE: (id: string) => `/polls/delete/${id}`,
    BULK_DELETE: '/polls/bulk-delete',
    VOTE: '/polls/vote',
  },

  // Tasks endpoints
  TASKS: {
    BASE: '/tasks/get-all',
    BY_ID: (id: string) => `/tasks/${id}`,
    CREATE: '/tasks/create',
    UPDATE: (id: string) => `/tasks/update/${id}`,
    DELETE: (id: string) => `/tasks/delete/${id}`,
    BULK_DELETE: '/tasks/bulk-delete',
  },

  // Organisations endpoints
  ORGANISATIONS: {
    BASE: '/organisations',
    BY_ID: (id: string) => `/organisations/${id}`,
    REGISTER: '/organisations/register',
    PENDING: '/organisations/pending',
  },

  // Custom Roles endpoints
  CUSTOM_ROLES: {
    BASE: '/custom-roles',
    CREATE: '/custom-roles/custom-role',
    BY_ID: (roleId: string) => `/custom-roles/${roleId}`,
    TOGGLE_STATUS: (roleId: string) => `/custom-roles/${roleId}/toggle-status`,
  },

  // Settings endpoints
  SETTINGS: {
    BY_ORG: (id: string) => `/settings/organizations/${id}`,
    ALL: '/settings/organizations/get-all',
    DEFAULT: '/settings/organizations/get-default',
    UPDATE: '/settings/organizations/update',
  },

  // Overview/Dashboard endpoints
  OVERVIEW: {
    ANALYTICS: '/overview/analytics',
    FINANCE: '/overview/finance',
  },
} as const;

export default API_CONFIG;
