import axios from '@/lib/axios';
import type { Participant, MeetingDecision, MeetingActionItem } from '@/types';

const API_URL = '/meetings';

export const meetingService = {
  // Meeting CRUD
  getAll: () => axios.get(API_URL),
  getById: (id: string) => axios.get(`${API_URL}/${id}`),
  create: (data: Record<string, unknown>) => axios.post(API_URL, data),
  update: (id: string, data: Record<string, unknown>) => axios.patch(`${API_URL}/${id}`, data),
  delete: (id: string) => axios.delete(`${API_URL}/${id}`),

  // State transitions
  schedule: (id: string) => axios.post(`${API_URL}/${id}/schedule`),
  start: (id: string, actorId: string) => axios.post(`${API_URL}/${id}/start`, { actorId }),
  pause: (id: string) => axios.post(`${API_URL}/${id}/pause`),
  resume: (id: string) => axios.post(`${API_URL}/${id}/resume`),
  complete: (id: string) => axios.post(`${API_URL}/${id}/complete`),
  archive: (id: string) => axios.post(`${API_URL}/${id}/archive`),

  // Agenda management
  activateAgendaItem: (meetingId: string, itemId: string, actorId: string) =>
    axios.post(`${API_URL}/${meetingId}/agenda/${itemId}/activate`, { actorId }),
  completeAgendaItem: (meetingId: string, itemId: string) =>
    axios.post(`${API_URL}/${meetingId}/agenda/${itemId}/complete`),
  skipAgendaItem: (meetingId: string, itemId: string) =>
    axios.post(`${API_URL}/${meetingId}/agenda/${itemId}/skip`),
  addAgendaItem: (meetingId: string, item: Record<string, unknown>) =>
    axios.post(`${API_URL}/${meetingId}/agenda`, item),

  // Decisions & Voting
  createDecision: (meetingId: string, decision: Partial<MeetingDecision>, actorId: string) =>
    axios.post(`${API_URL}/${meetingId}/decisions`, { ...decision, actorId }),
  castVote: (meetingId: string, decisionId: string, voterId: string, voteType: 'YES' | 'NO' | 'ABSTAIN') =>
    axios.post(`${API_URL}/${meetingId}/decisions/${decisionId}/vote`, { voterId, vote: voteType }),
  lockDecision: (meetingId: string, decisionId: string, actorId: string) =>
    axios.post(`${API_URL}/${meetingId}/decisions/${decisionId}/lock`, { actorId }),

  // Action Items
  createActionItem: (meetingId: string, actionItem: Partial<MeetingActionItem>, actorId: string) =>
    axios.post(`${API_URL}/${meetingId}/actions`, { ...actionItem, actorId }),

  // Live Notes
  addNote: (meetingId: string, content: string, actorId: string, actorName: string) =>
    axios.post(`${API_URL}/${meetingId}/notes`, { content, actorId, actorName }),

  // Participants
  updateAttendance: (meetingId: string, participantId: string, isPresent: boolean) =>
    axios.post(`${API_URL}/${meetingId}/participants/${participantId}/attendance`, { isPresent }),
  addParticipant: (meetingId: string, participant: Partial<Participant>) =>
    axios.post(`${API_URL}/${meetingId}/participants`, participant),

  // Minutes
  generateMinutes: (meetingId: string, preparedBy: string) =>
    axios.post(`${API_URL}/${meetingId}/minutes/generate`, { preparedBy }),
  approveMinutes: (meetingId: string, minutesId: string, approvedBy: string) =>
    axios.post(`${API_URL}/${meetingId}/minutes/${minutesId}/approve`, { approvedBy }),

  // Quorum
  validateQuorum: (meetingId: string) => axios.get(`${API_URL}/${meetingId}/quorum`),
};

export default meetingService;
