import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolvePrincipal } from "@/lib/authz/resolve-principal";
import { authorize } from "@/lib/authz/policy";

export const dynamic = "force-dynamic";

function isCalendarDate(value: string | null): value is string {
  if (!value || !/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export async function GET(request: NextRequest) {
  const checkIn = request.nextUrl.searchParams.get("check_in");
  const checkOut = request.nextUrl.searchParams.get("check_out");
  if (!isCalendarDate(checkIn) || !isCalendarDate(checkOut) || checkOut <= checkIn) {
    return NextResponse.json({
      error: "invalid_date_range",
      message: "Provide valid check_in and check_out dates; check_out must be after check_in.",
    }, { status: 400 });
  }

  try {
    const principal = await resolvePrincipal();
    if (!principal) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const membership = principal.memberships.find(
      (item) => item.active && (item.role === "hotel_owner" || item.role === "hotel_manager"),
    );
    if (!membership || !authorize({
      principal, permission: "rooms:read", propertyId: membership.propertyId,
    }).allowed) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const admin = createAdminClient();
    const [roomsResult, categoriesResult, allocationsResult] = await Promise.all([
      admin.from("rooms")
        .select("id,category_id,operational_status,is_bookable")
        .eq("property_id", membership.propertyId)
        .eq("operational_status", "ACTIVE")
        .eq("is_bookable", true),
      admin.from("room_categories")
        .select("id,name,max_occupancy,is_bookable")
        .eq("property_id", membership.propertyId)
        .eq("is_bookable", true),
      admin.from("room_allocations")
        .select("room_id,status")
        .eq("property_id", membership.propertyId)
        .in("status", ["HELD", "CONFIRMED", "CHECKED_IN"])
        .lt("check_in", checkOut)
        .gt("check_out", checkIn),
    ]);

    if (roomsResult.error || categoriesResult.error || allocationsResult.error) {
      return NextResponse.json({ error: "availability_unavailable" }, { status: 503 });
    }

    const allocatedRoomIds = new Set((allocationsResult.data ?? []).map((item) => item.room_id));
    const categories = (categoriesResult.data ?? []).map((category) => {
      const eligibleRooms = (roomsResult.data ?? []).filter(
        (room) => room.category_id === category.id,
      );
      const availableRooms = eligibleRooms.filter((room) => !allocatedRoomIds.has(room.id));
      return {
        category_id: category.id,
        category_name: category.name,
        max_occupancy: category.max_occupancy,
        total_bookable_rooms: eligibleRooms.length,
        available_rooms: availableRooms.length,
        availability: availableRooms.length > 0 ? "AVAILABLE" : "UNAVAILABLE",
      };
    });

    return NextResponse.json({
      property_id: membership.propertyId,
      check_in: checkIn,
      check_out: checkOut,
      categories,
      data_state: roomsResult.data?.length ? "calculated" : "inventory_not_configured",
      note: "Operational availability only. This endpoint does not create or hold a reservation.",
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "availability_unavailable" }, { status: 503 });
  }
}
