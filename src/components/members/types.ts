// src/components/members/types.ts
//
// Shared types for the Members module.
// `DisplayUser` is the UI-facing projection produced by MembersPage from the
// backend `User` DTO — components below the page should depend on this shape,
// not on the API model.

export interface DisplayUser {
  id:        string;
  name:      string;
  firstName: string;
  lastName:  string;
  email:     string;
  avatar?:   string;
  role:      string;
  position?: string;
  phone?:    string;
  isActive:  boolean;
}

/**
 * Canonical role values — MUST match the backend `eROLE` enum
 * (eBoard-server/src/common/enums/role.enums.ts).
 *
 * Sending any other string to the API will fail class-validator's
 * `@IsEnum(eROLE)` check on CreateUserDto / UpdateUserDto.
 */
export const ROLES = {
  SUPER_ADMIN:  'superAdmin',
  ORG_ADMIN:    'OrgAdmin',
  BOARD_MEMBER: 'BoardMember',
  SECRETARY:    'secretary',
} as const;

export type RoleValue = (typeof ROLES)[keyof typeof ROLES];
