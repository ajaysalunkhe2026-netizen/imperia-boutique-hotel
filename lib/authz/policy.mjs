/**
 * Pure authorization policy. The caller MUST supply a principal built from a
 * verified server-side session, never from request body or client-controlled headers.
 */
const ROLE_PERMISSIONS = Object.freeze({
  platform_admin: new Set(["platform:manage", "platform:diagnostics", "website:manage", "identity:support"]),
  hotel_owner: new Set(["hotel:read", "reports:business:read", "reports:operations:read", "rooms:read", "rooms:manage", "reservations:read", "reservations:manage", "payments:read", "payments:policy:approve", "payments:refund:approve", "staff:read", "staff:approve", "website:read", "website:approve", "audit:read"]),
  hotel_manager: new Set(["hotel:read", "reports:operations:read", "rooms:read", "rooms:manage", "reservations:read", "reservations:manage", "payments:status:read", "operations:manage", "website:read"]),
  guest: new Set(["reservation:create", "reservation:own:read", "payment:own:read", "profile:own:manage"]),
});
const PROPERTY_SCOPED_ROLES = new Set(["hotel_owner", "hotel_manager", "guest"]);

/**
 * Principal MUST come from a verified server-side session and fresh DB memberships.
 * @param {{principal:object|null, permission:string, propertyId?:string, resourceOwnerUserId?:string}} input
 * @returns {{allowed:boolean, reason:string}}
 */
export function authorize({ principal, permission, propertyId, resourceOwnerUserId } = {}) {
  if (!principal || principal.active !== true || principal.verified !== true ||
      typeof principal.userId !== "string" || principal.userId.length === 0) {
    return { allowed: false, reason: "unauthenticated_or_unverified" };
  }
  if (typeof permission !== "string" || permission.length === 0) {
    return { allowed: false, reason: "invalid_permission" };
  }
  const memberships = Array.isArray(principal.memberships) ? principal.memberships : [];

  if (permission.startsWith("platform:") || permission === "website:manage" || permission === "identity:support") {
    // This flag must be resolved from the separate platform_admin_assignments
    // table by trusted server code; it must never come from JWT user metadata.
    const isPlatformAdmin = principal.isPlatformAdmin === true;
    const grants = ROLE_PERMISSIONS.platform_admin;
    return isPlatformAdmin && grants.has(permission)
      ? { allowed: true, reason: "granted" }
      : { allowed: false, reason: "platform_scope_required" };
  }

  if (permission === "website:approve") {
    const owner = typeof propertyId === "string" && memberships.some(
      m => m && m.active === true && m.propertyId === propertyId && m.role === "hotel_owner"
    );
    return owner
      ? { allowed: true, reason: "granted" }
      : { allowed: false, reason: "property_owner_required" };
  }

  if (typeof propertyId !== "string" || propertyId.length === 0) {
    return { allowed: false, reason: "property_scope_required" };
  }

  for (const membership of memberships) {
    if (!membership || membership.active !== true || membership.propertyId !== propertyId ||
        !PROPERTY_SCOPED_ROLES.has(membership.role)) continue;
    const grants = ROLE_PERMISSIONS[membership.role];
    if (!grants || !grants.has(permission)) continue;
    if (membership.role === "guest" && resourceOwnerUserId !== principal.userId) {
      return { allowed: false, reason: "guest_resource_not_owned" };
    }
    return { allowed: true, reason: "granted" };
  }
  return { allowed: false, reason: "permission_not_granted" };
}
export { ROLE_PERMISSIONS };
