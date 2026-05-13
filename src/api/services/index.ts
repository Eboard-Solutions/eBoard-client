// src/api/services/index.ts
// Barrel export for all API services

export { authService } from './auth.service';
export { usersService } from './users.service';
export { meetingsService } from './meetings.service';
export { agendasService } from './agendas.service';
export { announcementsService } from './announcements.service';
export { documentsService } from './documents.service';
export { adminService } from './admin.service';
export { default as MinutesService } from './minutes.service';
export { default as NotificationsService } from './notifications.service';
export { default as PollsService } from './polls.service';
export { default as TasksService } from './tasks.service';
export { default as SettingsService } from './settings.service';
export { default as OverviewService } from './overview.service';
export { default as OrganisationsService } from './organisations.service';
export { default as resolutionsService } from './resolutions.service';
export { default as messagesService } from './messages.service';
export { default as complianceService } from './compliance.service';

// Re-export the API client for direct access if needed
export { default as apiClient, TokenService } from '../client';
