import "server-only";

import type { Principal, AppRole } from "./policy";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (value: unknown): value is string =>
  typeof value === "string" && UUID_PATTERN.test(value);

function throwIfError(error: { message?: string } | null, operation: string): void {
  if (error) {
    // Never log access tokens, guest data, or provider payloads.
    throw new Error(`Identity resolution failed during ${operation}.`);
  }
}

/**
 * Resolve a verified Supabase Auth user to current application assignments.
 * This function is server-only and does not itself authorize a business action.
 *
 * Invalid/unconfirmed/unmapped identities return null. Privileged database
 * failures throw a generic error so callers fail closed.
 */
export async function resolvePrincipal(): Promise<Principal | null> {
  const sessionClient = await createSessionClient();

  // getUser() validates the cookie-backed access token against Supabase Auth
  // and returns the current Auth user record. Do not trust getSession().user.
  const { data: userData, error: authError } = await sessionClient.auth.getUser();
  if (authError || !userData.user) return null;

  const authUser = userData.user;
  if (!isUuid(authUser.id) || !authUser.email || !authUser.email_confirmed_at) {
    return null;
  }

  const admin = createAdminClient();
  const { data: appUser, error: identityError } = await admin
    .from("app_users")
    .select("id,is_active")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();

  throwIfError(identityError, "application identity lookup");
  if (!appUser || appUser.is_active !== true || !isUuid(appUser.id)) return null;

  const appUserId = appUser.id;
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
    if (!isUuid(membership.property_id)) continue;

    resolvedMemberships.push({
      propertyId: membership.property_id,
      role,
      active: membership.is_active === true,
    });
  }

  // A guest gets property scope only when a guest profile is explicitly linked
  // to this authenticated application user. Guest PII is never returned here.
  for (const guest of guestProfiles ?? []) {
    if (!isUuid(guest.property_id)) continue;
    if (!resolvedMemberships.some(
      (membership) => membership.propertyId === guest.property_id && membership.role === "guest",
    )) {
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
