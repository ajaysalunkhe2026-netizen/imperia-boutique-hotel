export type AppRole = "platform_admin" | "hotel_owner" | "hotel_manager" | "guest";
export interface Principal {
  userId: string;
  active: boolean;
  verified: boolean;
  memberships: Array<{ propertyId: string; role: AppRole; active: boolean }>;
}
export interface AuthorizationInput {
  principal: Principal | null;
  permission: string;
  propertyId?: string;
  resourceOwnerUserId?: string;
}
export interface AuthorizationDecision { allowed: boolean; reason: string }
/** Principal must be built from a verified server-side session and current database memberships. */
export function authorize(input: AuthorizationInput): AuthorizationDecision;
export const ROLE_PERMISSIONS: Readonly<Record<AppRole, ReadonlySet<string>>>;
