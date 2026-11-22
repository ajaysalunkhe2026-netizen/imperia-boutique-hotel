export type AppRole = "platform_admin" | "hotel_owner" | "hotel_manager" | "guest";
export interface Principal {
  userId: string;
  active: boolean;
  verified: boolean;
  /** Resolved from an active platform_admin_assignments row by trusted server code. */
  isPlatformAdmin: boolean;
  memberships: Array<{ propertyId: string; role: AppRole; active: boolean }>;
}
export interface AuthorizationInput {
  principal: Principal | null;
  permission: string;
  propertyId?: string;
  /** Must be loaded from the trusted database record, never from request input. */
  resourceOwnerUserId?: string;
}
export interface AuthorizationDecision { allowed: boolean; reason: string }
/** Permission arrays are frozen at runtime; use authorize() for decisions. */
export const ROLE_PERMISSIONS: Readonly<Record<AppRole, readonly string[]>>;
export function authorize(input: AuthorizationInput): AuthorizationDecision;
