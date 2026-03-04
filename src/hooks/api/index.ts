// src/hooks/api/index.ts
// Barrel export for all API hooks

// Auth hooks
export {
  useCurrentUser,
  useLogin,
  useOrgAdminLogin,
  useSuperAdminLogin,
  useRegisterOrgAdmin,
  useLogout,
  useUpdateProfile,
  useChangePassword,
  useForgotPassword,
  useResetPassword,
  AUTH_QUERY_KEYS,
} from './useAuth';

// User hooks
export {
  useOrganisationUsers,
  useUsers,
  useUser,
  useUserPermissions,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useAssignRole,
  useChangeRole,
  useToggleUserStatus,
  USERS_QUERY_KEYS,
} from './useUsers';

// Meeting hooks
export {
  useMeetings,
  useMyMeetings,
  useMeeting,
  useMeetingAttendees,
  useMeetingAttendeeStats,
  useCreateMeeting,
  useUpdateMeeting,
  useDeleteMeeting,
  useAddAttendees,
  useRemoveAttendee,
  useRSVP,
  useStartMeeting,
  useCompleteMeeting,
  useCancelMeeting,
  MEETINGS_QUERY_KEYS,
} from './useMeetings';

// Agenda hooks
export {
  useAgendas,
  useAgenda,
  useAgendaByMeeting,
  useAgendaStats,
  useCreateAgenda,
  useUpdateAgenda,
  useDeleteAgenda,
  usePublishAgenda,
  useAddAgendaItem,
  useUpdateAgendaItem,
  useDeleteAgendaItem,
  useReorderAgendaItems,
  useStartAgendaItem,
  useCompleteAgendaItem,
  AGENDAS_QUERY_KEYS,
} from './useAgendas';

// Announcement hooks
export {
  useAnnouncements,
  useAnnouncement,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
  useBulkDeleteAnnouncements,
  ANNOUNCEMENTS_QUERY_KEYS,
} from './useAnnouncements';

// Document hooks
export {
  useDocuments,
  useDocument,
  useCreateDocument,
  useUpdateDocument,
  useDeleteDocument,
  useBulkDeleteDocuments,
  DOCUMENTS_QUERY_KEYS,
} from './useDocuments';

// Minutes hooks
export {
  useMinutes,
  useMinutesById,
  useMinutesByMeeting,
  useCreateMinutes,
  useUpdateMinutes,
  useDeleteMinutes,
  useApproveMinutes,
  usePublishMinutes,
  useSubmitMinutesForReview,
  useAddMinuteItem,
  useUpdateMinuteItem,
  useDeleteMinuteItem,
  useReorderMinuteItems,
  minutesKeys,
} from './useMinutes';

// Notification hooks
export {
  useNotifications,
  useNotificationById,
  useUnreadNotificationsCount,
  useCreateNotification,
  useUpdateNotification,
  useDeleteNotification,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useToggleNotificationFlag,
  useBulkDeleteNotifications,
  notificationKeys,
} from './useNotifications';

// Poll hooks
export {
  usePolls,
  usePollById,
  useCreatePoll,
  useUpdatePoll,
  useDeletePoll,
  useVotePoll,
  useBulkDeletePolls,
  pollKeys,
} from './usePolls';

// Task hooks
export {
  useTasks,
  useTaskById,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useCompleteTask,
  useBulkDeleteTasks,
  taskKeys,
} from './useTasks';

// Settings hooks
export {
  useOrganisationSettings,
  useAllSettings,
  useDefaultSettings,
  useUpdateSettings,
  settingsKeys,
} from './useSettings';

// Overview/Analytics hooks
export {
  useAnalytics,
  useFinanceOverview,
  useDashboardSummary,
  overviewKeys,
} from './useOverview';

// Organisation hooks
export {
  useOrganisations,
  useOrganisationById,
  usePendingOrganisations,
  useRegisterOrganisation,
  useUpdateOrganisation,
  useDeleteOrganisation,
  useApproveOrganisation,
  organisationKeys,
} from './useOrganisations';
