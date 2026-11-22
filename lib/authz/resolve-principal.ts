import "server-only";

import type { Principal, AppRole } from "./policy";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type AuthClaims = {
  sub?: unknown;
  email_verified?: unknown;
};

const isUuidLike = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

function throwIfError(error: { message?: string } | null, operation: string): void {
  if (error) {
    // Do not log tokens, guest data, or provider payloads here.
    throw new Error(`Identity resolution failed during ${operation}.`);
  }
}

/**
 * Resolves a verified Supabase session into application identity and fresh
 * property/global assignments. Must only be called from trusted server code.
 *
 * Returns null for unauthenticated, unverified, disabled, or unmapped users.
 * Throws a generic error for database/provider failures so callers fail closed.
 */
export async function resolvePrincipal(): Promise<Principal | null> {
  const sessionClient = await createSessionClient();
  const { data: claimData, error: claimError } = await sessionClient.auth.getClaims();

  if (claimError || !claimData?.claims) return null;
  const claims = claimData.claims as AuthClaims;
  if (!isUuidLike(claims.sub) || claims.email_verified !== true) return null;

  const admin = createAdminClient();
  const { data: identity, error: identityError } = await admin
    .from("auth_identities")
    .select("app_user_id")
    .eq("provider", "supabase")
    .eq("provider_subject", claims.sub)
    .maybeSingle();
  throwIfError(identityError, "identity lookup");
  if (!identity || !isUuidLike(identity.app_user_id)) return null;

  const appUserId = identity.app_user_id;
  const { data: appUser, error: userError } = await admin
    .from("app_users")
    .select("id,is_active")
    .eq("id", appUserId)
    .maybeSingle();
  throwIfError(userError, "application user lookup");
  if (!appUser || appUser.is_active !== true) return null;

  const [
    { data: memberships, error: membershipsError },
    { data: adminAssignment, error: adminError },
    { data: guestProfiles, error: guestError },
  ] = await Promise.all([
    admin.from("property_memberships")
      .select("property_id,role,is_active")
      .eq("user_id", appUserId)
      .eq("is_active", true),
    admin.from("platform_admin_assignments")
      .select("id")
      .eq("user_id", appUserId)
      .eq("is_active", true)
      .maybeSingle(),
    admin.from("guests")
      .select("property_id")
      .eq("user_id", appUserId),
  ]);

  throwIfError(membershipsError, "property membership lookup");
  throwIfError(adminError, "platform assignment lookup");
  throwIfError(guestError, "guest profile lookup");

  const resolvedMemberships: Principal["memberships"] = [];
  for (const membership of memberships ?? []) {
    const role = membership.role as AppRole;
    if (role !== "hotel_owner" && role !== "hotel_manager") continue;
    if (!isUuidLike(membership.property_id)) continue;
    resolvedMemberships.push({
      propertyId: membership.property_id,
      role,
      active: membership.is_active === true,
    });
  }

  for (const guest of guestProfiles ?? []) {
    if (!isUuidLike(guest.property_id)) continue;
    if (!resolvedMemberships.some(m => m.propertyId === guest.property_id && m.role === "guest")) {
      resolvedMemberships.push({
        propertyId: guest.property_id,
        role: "guest",
        active: true,
      });
    }
  }

  return {
    userId: appUserId,
    active: true,
    verified: true,
    isPlatformAdmin: Boolean(adminAssignment),
    memberships: resolvedMemberships,
  };
}
