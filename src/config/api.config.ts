// src/config/api.config.ts
export const API_CONFIG = {
  BASE_URL: `${import.meta.env.VITE_API_URL}/api/v1`,
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;

export const ENDPOINTS = {
  AUTH: {
    LOGIN:                    '/auth/login',
    ORG_ADMIN_LOGIN:          '/auth/org-admin/login',
    SUPER_ADMIN_LOGIN:        '/auth/super-admin/login',
    REGISTER_ORG_ADMIN:       '/auth/register/org-admin',
    LOGOUT:       (userId: string) => `/auth/logout/${userId}`,
    REFRESH_TOKENS:           '/auth/refresh-tokens',
    ME:                       '/auth/me',
    FORGOT_PASSWORD:          '/auth/forgot-password',
    FORGOT_PASSWORD_SUPER_ADMIN: '/auth/forgot-password/super-admin',
    RESET_PASSWORD:           '/auth/reset-password',
    CHANGE_PASSWORD:          '/auth/change-password',
    ACTIVATE_ACCOUNT:         '/auth/activate-account',
    DELETE_ACCOUNT: (id: string) => `/auth/delete-account/${id}`,
    INTROSPECT:               '/auth/introspect',
  },

  USERS: {
    BASE:               '/user',
    BY_ID:    (userId: string) => `/user/${userId}`,
    ORGANISATION_USERS: '/user/organisation-users',
    SUPER_ADMIN:        '/user/super-admin',
    ASSIGN_ROLE:  (userId: string) => `/user/${userId}/assign-role`,
    CHANGE_ROLE:  (userId: string) => `/user/${userId}/change-role`,
    TOGGLE_STATUS:(userId: string) => `/user/${userId}/toggle-status`,
    PERMISSIONS:  (userId: string) => `/user/${userId}/permissions`,
  },

  ADMIN: {
    APPROVE_ORG: (organisationId: string) => `/admin/organisations/${organisationId}/approve`,
  },

  MEETINGS: {
    BASE:             '/meetings',
    BY_ID:  (id: string) => `/meetings/${id}`,
    MY_MEETINGS:      '/meetings/my-meetings',
    ADD_ATTENDEE:     (id: string) => `/meetings/${id}/attendee`,
    REMOVE_ATTENDEE:  (meetingId: string, userId: string) => `/meetings/${meetingId}/attendees/${userId}`,
    ATTENDEES:        (id: string) => `/meetings/${id}/attendees`,
    ATTENDEE_STATS:   (id: string) => `/meetings/${id}/attendee-stats`,
    RSVP:             (id: string) => `/meetings/${id}/rsvp`,
    START:            (id: string) => `/meetings/${id}/start`,
    COMPLETE:         (id: string) => `/meetings/${id}/complete`,
    CANCEL:           (id: string) => `/meetings/${id}/cancel`,
  },

  AGENDAS: {
    BASE:             '/agendas',
    BY_ID:  (id: string) => `/agendas/${id}`,
    BY_MEETING: (id: string) => `/agendas/meeting/${id}`,
    PUBLISH:    (id: string) => `/agendas/${id}/publish`,
    STATS:      (id: string) => `/agendas/${id}/stats`,
    ITEMS: {
      ADD:      (id: string) => `/agendas/${id}/items`,
      UPDATE:   (agendaId: string, itemId: string) => `/agendas/${agendaId}/items/${itemId}`,
      DELETE:   (agendaId: string, itemId: string) => `/agendas/${agendaId}/items/${itemId}`,
      REORDER:  (id: string) => `/agendas/${id}/items/reorder`,
      START:    (agendaId: string, itemId: string) => `/agendas/${agendaId}/items/${itemId}/start`,
      COMPLETE: (agendaId: string, itemId: string) => `/agendas/${agendaId}/items/${itemId}/complete`,
    },
  },

  MINUTES: {
    BASE:              '/minutes',
    BY_ID:   (id: string) => `/minutes/${id}`,
    BY_MEETING: (id: string) => `/minutes/meeting/${id}`,
    APPROVE:    (id: string) => `/minutes/${id}/approve`,
    PUBLISH:    (id: string) => `/minutes/${id}/publish`,
    SUBMIT_REVIEW: (id: string) => `/minutes/${id}/submit-review`,
    ITEMS: {
      ADD:     (id: string) => `/minutes/${id}/items`,
      UPDATE:  (minutesId: string, itemId: string) => `/minutes/${minutesId}/items/${itemId}`,
      DELETE:  (minutesId: string, itemId: string) => `/minutes/${minutesId}/items/${itemId}`,
      REORDER: (id: string) => `/minutes/${id}/items/reorder`,
    },
  },

  ANNOUNCEMENTS: {
    BASE:        '/announcements/get-all',
    BY_ID:  (id: string) => `/announcements/${id}`,
    CREATE:      '/announcements/create',
    UPDATE: (id: string) => `/announcements/update/${id}`,
    DELETE: (id: string) => `/announcements/delete/${id}`,
    BULK_DELETE: '/announcements/bulk-delete',
  },

  DOCUMENTS: {
    BASE:        '/documents/get-all',
    BY_ID:  (id: string) => `/documents/${id}`,
    CREATE:      '/documents/create',
    UPDATE: (id: string) => `/documents/update/${id}`,
    DELETE: (id: string) => `/documents/delete/${id}`,
    BULK_DELETE: '/documents/bulk-delete',
    // The backend doesn't expose a static fileUrl on Document responses —
    // files live in Azure Blob Storage and need a signed temporary URL.
    // Always call this endpoint to obtain a viewable URL just-in-time.
    DOWNLOAD_URL: (id: string) => `/documents/${id}/download-url`,
  },

  NOTIFICATIONS: {
    BASE:        '/notifications/get-all',
    BY_ID:  (id: string) => `/notifications/${id}`,
    CREATE:      '/notifications/create',
    UPDATE: (id: string) => `/notifications/update/${id}`,
    DELETE: (id: string) => `/notifications/delete/${id}`,
    BULK_DELETE: '/notifications/bulk-delete',
  },

  POLLS: {
    BASE:        '/polls/get-all',
    BY_ID:  (id: string) => `/polls/${id}`,
    CREATE:      '/polls/create',
    UPDATE: (id: string) => `/polls/update/${id}`,
    DELETE: (id: string) => `/polls/delete/${id}`,
    BULK_DELETE: '/polls/bulk-delete',
    VOTE:        '/polls/vote',
  },

  TASKS: {
    BASE:        '/tasks/get-all',
    BY_ID:  (id: string) => `/tasks/${id}`,
    CREATE:      '/tasks/create',
    UPDATE: (id: string) => `/tasks/update/${id}`,
    DELETE: (id: string) => `/tasks/delete/${id}`,
    BULK_DELETE: '/tasks/bulk-delete',
  },

  ORGANISATIONS: {
    BASE:              '/organisations',
    BY_ID: (id: string) => `/organisations/${id}`,
    // ── NEW: OrgAdmin fetches their own org without needing to know the UUID
    MY_ORGANISATION:   '/organisations/my-organisation',
    REGISTER:          '/organisations/register',
    PENDING:           '/organisations/pending',
  },

  CUSTOM_ROLES: {
    BASE:              '/custom-roles',
    CREATE:            '/custom-roles/custom-role',
    BY_ID:       (id: string) => `/custom-roles/${id}`,
    TOGGLE_STATUS:(id: string) => `/custom-roles/${id}/toggle-status`,
  },

  SETTINGS: {
    BY_ORG:  (id: string) => `/settings/organizations/${id}`,
    ALL:     '/settings/organizations/get-all',
    DEFAULT: '/settings/organizations/get-default',
    UPDATE:  '/settings/organizations/update',
  },

  OVERVIEW: {
    ANALYTICS: '/overview/analytics',
    FINANCE:   '/overview/finance',
  },
} as const;

export default API_CONFIG;