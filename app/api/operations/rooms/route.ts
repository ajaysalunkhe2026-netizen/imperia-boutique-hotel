import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolvePrincipal } from "@/lib/authz/resolve-principal";
import { authorize } from "@/lib/authz/policy";

export const dynamic = "force-dynamic";

export async function GET() {
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
    const [roomsResult, categoriesResult] = await Promise.all([
      admin.from("rooms")
        .select("id,category_id,room_number,operational_status,is_bookable")
        .eq("property_id", membership.propertyId)
        .order("room_number", { ascending: true }),
      admin.from("room_categories")
        .select("id,name,description,max_occupancy,is_bookable,display_order")
        .eq("property_id", membership.propertyId)
        .order("display_order", { ascending: true }),
    ]);

    if (roomsResult.error || categoriesResult.error) {
      return NextResponse.json({ error: "inventory_unavailable" }, { status: 503 });
    }

    const rooms = roomsResult.data ?? [];
    const categories = (categoriesResult.data ?? []).map((category) => {
      const categoryRooms = rooms.filter((room) => room.category_id === category.id);
      return {
        ...category,
        room_count: categoryRooms.length,
        active_room_count: categoryRooms.filter(
          (room) => room.operational_status === "ACTIVE" && room.is_bookable,
        ).length,
      };
    });

    return NextResponse.json({
      property_id: membership.propertyId,
      categories,
      rooms,
      totals: {
        configured_rooms: rooms.length,
        active_bookable_rooms: rooms.filter(
          (room) => room.operational_status === "ACTIVE" && room.is_bookable,
        ).length,
      },
      data_state: rooms.length === 0 ? "inventory_not_configured" : "configured",
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "inventory_unavailable" }, { status: 503 });
  }
}
