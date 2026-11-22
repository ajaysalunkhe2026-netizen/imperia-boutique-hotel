/**
 * Pure authorization policy.
 * The principal must be created by trusted server-side identity resolution.
 */
const ROLE_PERMISSIONS = Object.freeze({
  platform_admin: Object.freeze([
    "platform:manage",
    "platform:diagnostics",
    "website:manage",
    "identity:support",
    "reports:business:aggregate:read",
    "reports:revenue:aggregate:read",
    "reports:commission:read",
  ]),
  hotel_owner: Object.freeze([
    "hotel:read", "reports:business:read", "reports:operations:read",
    "rooms:read", "rooms:manage", "reservations:read", "reservations:manage",
    "payments:read", "payments:policy:approve", "payments:refund:approve",
    "staff:read", "staff:approve", "website:read", "website:approve", "audit:read",
  ]),
  hotel_manager: Object.freeze([
    "hotel:read", "reports:operations:read", "rooms:read", "rooms:manage",
    "reservations:read", "reservations:manage", "payments:status:read",
    "operations:manage", "website:read",
  ]),
  guest: Object.freeze([
    "reservation:create", "reservation:own:read", "payment:own:read", "profile:own:manage",
  ]),
});

const PROPERTY_SCOPED_ROLES = new Set(["hotel_owner", "hotel_manager", "guest"]);
const PLATFORM_ONLY_PERMISSIONS = new Set([
  "platform:manage",
  "platform:diagnostics",
  "website:manage",
  "identity:support",
  "reports:business:aggregate:read",
  "reports:revenue:aggregate:read",
  "reports:commission:read",
]);

/**
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

  if (PLATFORM_ONLY_PERMISSIONS.has(permission)) {
    return principal.isPlatformAdmin === true &&
      ROLE_PERMISSIONS.platform_admin.includes(permission)
      ? { allowed: true, reason: "granted" }
      : { allowed: false, reason: "platform_scope_required" };
  }

  // Platform Admin is a separate global role, not an additional hotel role.
  // It must not inherit raw hotel permissions from an accidental membership.
  if (principal.isPlatformAdmin === true) {
    return { allowed: false, reason: "platform_admin_hotel_scope_denied" };
  }

  if (permission === "website:approve") {
    const owner = typeof propertyId === "string" && memberships.some(
      (membership) => membership &&
        membership.active === true &&
        membership.propertyId === propertyId &&
        membership.role === "hotel_owner",
    );
    return owner
      ? { allowed: true, reason: "granted" }
      : { allowed: false, reason: "property_owner_required" };
  }

  if (typeof propertyId !== "string" || propertyId.length === 0) {
    return { allowed: false, reason: "property_scope_required" };
  }

  for (const membership of memberships) {
    if (!membership || membership.active !== true ||
        membership.propertyId !== propertyId ||
        !PROPERTY_SCOPED_ROLES.has(membership.role)) continue;

    const grants = ROLE_PERMISSIONS[membership.role];
    if (!grants || !grants.includes(permission)) continue;

    if (membership.role === "guest" && resourceOwnerUserId !== principal.userId) {
      continue;
    }

    return { allowed: true, reason: "granted" };
  }

  return { allowed: false, reason: "permission_not_granted" };
}

export { ROLE_PERMISSIONS };
