import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolvePrincipal } from "@/lib/authz/resolve-principal";
import { authorize } from "@/lib/authz/policy";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const { property_id, category_id, check_in, check_out, adults, children, idempotency_key } = input;

  if (typeof property_id !== "string" || !UUID.test(property_id) ||
      typeof category_id !== "string" || !UUID.test(category_id) ||
      typeof idempotency_key !== "string" || !UUID.test(idempotency_key) ||
      !validDate(check_in) || !validDate(check_out) || check_out <= check_in ||
      !Number.isInteger(adults) || (adults as number) < 1 || (adults as number) > 8 ||
      !Number.isInteger(children) || (children as number) < 0 || (children as number) > 8) {
    return NextResponse.json({ error: "invalid_booking_request" }, { status: 400 });
  }

  try {
    const principal = await resolvePrincipal();
    if (!principal) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const membership = principal.memberships.find(
      (item) => item.active && item.role === "guest" && item.propertyId === property_id,
    );
    if (!membership || !authorize({
      principal, permission: "reservation:create", propertyId: property_id,
    }).allowed) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data: guest, error: guestError } = await admin
      .from("guests")
      .select("id")
      .eq("property_id", property_id)
      .eq("user_id", principal.userId)
      .maybeSingle();

    if (guestError) return NextResponse.json({ error: "booking_unavailable" }, { status: 503 });
    if (!guest) return NextResponse.json({ error: "guest_profile_not_linked" }, { status: 403 });

    const { data, error } = await admin.rpc("create_booking_hold", {
      p_property_id: property_id,
      p_guest_id: guest.id,
      p_category_id: category_id,
      p_check_in: check_in,
      p_check_out: check_out,
      p_adults: adults,
      p_children: children,
      p_idempotency_key: idempotency_key,
    });

    if (error) {
      if (error.code === "P0001") {
        return NextResponse.json({ error: "no_availability" }, { status: 409 });
      }
      if (error.code === "22023" || error.code === "23514") {
        return NextResponse.json({ error: "booking_request_rejected" }, { status: 400 });
      }
      if (error.code === "55P03") {
        return NextResponse.json({ error: "booking_request_in_progress" }, { status: 409 });
      }
      return NextResponse.json({ error: "booking_unavailable" }, { status: 503 });
    }

    return NextResponse.json(data, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "booking_unavailable" }, { status: 503 });
  }
}
