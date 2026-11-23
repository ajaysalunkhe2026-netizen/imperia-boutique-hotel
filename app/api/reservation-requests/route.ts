import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + "T00:00:00Z"));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (typeof body.website === "string" && body.website.trim()) {
      return NextResponse.json({ ok: true, reference: "RECEIVED" });
    }

    const { checkIn, checkOut, adults, children, rooms, roomType, name, phone, email, notes } = body ?? {};
    if (!validDate(checkIn) || !validDate(checkOut)) {
      return NextResponse.json({ error: "Please provide valid check-in and check-out dates." }, { status: 400 });
    }
    const nights = (Date.parse(checkOut + "T00:00:00Z") - Date.parse(checkIn + "T00:00:00Z")) / 86400000;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (Date.parse(checkIn + "T00:00:00Z") < today.getTime() || nights < 1 || nights > 30) {
      return NextResponse.json({ error: "Please choose future dates for a stay of 1 to 30 nights." }, { status: 400 });
    }
    if (!Number.isInteger(adults) || adults < 1 || adults > 6 ||
        !Number.isInteger(children) || children < 0 || children > 4 ||
        !Number.isInteger(rooms) || rooms < 1 || rooms > 4) {
      return NextResponse.json({ error: "Please check the guest and room counts." }, { status: 400 });
    }
    if (typeof name !== "string" || name.trim().length < 2 || name.length > 100 ||
        typeof phone !== "string" || !/^\+?[0-9 ()-]{8,20}$/.test(phone.trim()) ||
        typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        !["Any available room", "Amber Stone", "Opal Suite"].includes(roomType) ||
        (notes !== undefined && (typeof notes !== "string" || notes.length > 1000))) {
      return NextResponse.json({ error: "Please check your contact details and reservation information." }, { status: 400 });
    }

    const reference = "IMP-" + randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
    const supabase = await createClient();
    const { error } = await supabase.from("reservation_requests").insert({
      reference,
      check_in: checkIn,
      check_out: checkOut,
      adults,
      children,
      rooms,
      room_type: roomType,
      guest_name: name.trim(),
      guest_phone: phone.trim(),
      guest_email: email.trim().toLowerCase(),
      notes: typeof notes === "string" ? notes.trim() : null,
      status: "pending",
    });

    if (error) {
      console.error("Reservation request storage failed:", error.code);
      return NextResponse.json({ error: "The reservation service is temporarily unavailable. Please contact the hotel directly." }, { status: 503 });
    }

    return NextResponse.json({ ok: true, reference }, { status: 201 });
  } catch (error) {
    console.error("Reservation request error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "The reservation service is temporarily unavailable. Please contact the hotel directly." }, { status: 503 });
  }
}
