// Access control / locking helpers for the meeting + minutes module.
//
// Two concerns we collapse into one shared utility because they always show
// up together in the UI:
//
//   1. The meeting itself is "finalized" — completed or cancelled. Once a
//      meeting is in one of those terminal states, its details (title,
//      date, attendee list) should not be editable. Editing a completed
//      meeting's date silently corrupts the audit trail.
//
//   2. The minutes are "published". A published minutes record is the
//      official record of the meeting — by definition it must not change
//      once stakeholders rely on it. Approved minutes are similarly
//      gated, only the publisher can re-open them.
//
// Returning a richer shape than `boolean` (a `reason` field) lets the UI
// show the user *why* a button is disabled instead of just greying it out
// silently, which is a major UX complaint with locked workflows.

import type { Meeting, Minutes } from '@/types/api.types';

export type LockReason =
  | 'meeting-completed'
  | 'meeting-cancelled'
  | 'minutes-approved'
  | 'minutes-published'
  | null;

export interface MeetingLockState {
  /** Meeting is in a terminal state. */
  isMeetingFinalized: boolean;
  /** Either the meeting OR its minutes are locked. UI should respect this. */
  isLocked: boolean;
  /** Why is it locked? Used to render the banner copy. */
  reason: LockReason;
  /** Granular flags so individual buttons can opt in. */
  canEditMeeting: boolean;
  canEditMinutes: boolean;
  canDeleteMinutes: boolean;
  canPublishMinutes: boolean;
  /** Human-readable label for the banner. */
  label: string;
}

export function computeMeetingLock(
  meeting: Meeting | null | undefined,
  minutes: Minutes | null | undefined,
): MeetingLockState {
  const meetingStatus = meeting?.status;
  const minutesStatus = minutes?.status;

  const meetingCompleted = meetingStatus === 'completed';
  const meetingCancelled = meetingStatus === 'cancelled';
  const minutesPublished = minutesStatus === 'published';
  const minutesApproved  = minutesStatus === 'approved';

  // Lock priority: published minutes is the strongest signal (official
  // record), then approved (waiting for publish), then meeting cancelled
  // (decision was: this didn't happen), then meeting completed (default
  // finalized state).
  let reason: LockReason = null;
  let label = 'Editable';
  if (minutesPublished) {
    reason = 'minutes-published';
    label = 'Minutes published — locked';
  } else if (minutesApproved) {
    reason = 'minutes-approved';
    label = 'Minutes approved — pending publish';
  } else if (meetingCancelled) {
    reason = 'meeting-cancelled';
    label = 'Meeting cancelled — locked';
  } else if (meetingCompleted) {
    reason = 'meeting-completed';
    label = 'Meeting completed — limited edits';
  }

  return {
    isMeetingFinalized: meetingCompleted || meetingCancelled,
    isLocked: reason !== null,
    reason,
    label,

    // Granular gates. A completed meeting still allows minutes editing
    // (you're documenting what happened), but a cancelled meeting blocks
    // everything (it didn't happen). Published minutes block all minutes
    // edits across the board.
    canEditMeeting: !(meetingCompleted || meetingCancelled || minutesPublished),
    canEditMinutes: !(meetingCancelled || minutesPublished),
    canDeleteMinutes: !(minutesPublished || minutesApproved),
    canPublishMinutes: minutesStatus === 'approved' && !meetingCancelled,
  };
}
