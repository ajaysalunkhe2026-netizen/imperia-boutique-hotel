import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + "T00:00:00Z"));
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 12_000) {
      return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    }
    if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
      return NextResponse.json({ error: "A JSON request is required." }, { status: 415 });
    }
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid reservation request." }, { status: 400 });
    }
    if (typeof body.website === "string" && body.website.trim()) {
      return NextResponse.json({ ok: true, reference: "RECEIVED" });
    }

    const { checkIn, checkOut, adults, children, rooms, roomType, name, phone, email, notes } = body ?? {};
    if (!validDate(checkIn) || !validDate(checkOut)) {
      return NextResponse.json({ error: "Please provide valid check-in and check-out dates." }, { status: 400 });
    }
    const nights = (Date.parse(checkOut + "T00:00:00Z") - Date.parse(checkIn + "T00:00:00Z")) / 86400000;
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date());
    if (checkIn < today || nights < 1 || nights > 30) {
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

    // Notifications are best-effort: a provider outage must not lose a saved enquiry.
    const stay = `${checkIn} to ${checkOut} (${nights} night${nights === 1 ? "" : "s"})`;
    const guestSummary = `${adults} adult(s), ${children} child(ren), ${rooms} room(s)`;
    const notificationTasks: Promise<void>[] = [];

    const resendKey = process.env.RESEND_API_KEY;
    const notifyEmail = process.env.RESERVATION_NOTIFY_EMAIL || "imperiabotiquehotel@gmail.com";
    const senderEmail = process.env.RESERVATION_FROM_EMAIL;
    if (resendKey && senderEmail) {
      notificationTasks.push((async () => {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: senderEmail,
            to: [notifyEmail],
            subject: `New reservation enquiry ${reference}`,
            text: [
              "A new reservation enquiry has been submitted.",
              `Reference: ${reference}`, `Guest: ${name.trim()}`, `Stay: ${stay}`,
              `Guests/rooms: ${guestSummary}`, `Room preference: ${roomType}`,
              `Mobile: ${phone.trim()}`, `Email: ${email.trim()}`,
              `Notes: ${typeof notes === "string" ? notes.trim() : "None"}`,
              "Status: Pending hotel confirmation. This is not a confirmed booking.",
            ].join("\\n"),
          }),
        });
        if (!response.ok) throw new Error(`Reservation email provider returned ${response.status}`);
      })());
    }

    const waToken = process.env.WHATSAPP_CLOUD_ACCESS_TOKEN;
    const waPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const waRecipients = (process.env.WHATSAPP_NOTIFY_TO || "").split(",").map((v) => v.replace(/\\D/g, "")).filter(Boolean);
    const waTemplate = process.env.WHATSAPP_TEMPLATE_NAME;
    if (waToken && waPhoneNumberId && waTemplate && waRecipients.length) {
      for (const recipient of waRecipients) {
        notificationTasks.push((async () => {
          const response = await fetch(`https://graph.facebook.com/v22.0/${waPhoneNumberId}/messages`, {
            method: "POST",
            headers: { Authorization: `Bearer ${waToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              recipient_type: "individual",
              to: recipient,
              type: "template",
              template: {
                name: waTemplate,
                language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en" },
                components: [{
                  type: "body",
                  parameters: [
                    { type: "text", text: reference },
                    { type: "text", text: name.trim() },
                    { type: "text", text: stay },
                    { type: "text", text: guestSummary },
                    { type: "text", text: phone.trim() },
                  ],
                }],
              },
            }),
          });
          if (!response.ok) throw new Error(`WhatsApp provider returned ${response.status}`);
        })());
      }
    }

    const notificationResults = await Promise.allSettled(notificationTasks);
    const failedNotifications = notificationResults.filter((result) => result.status === "rejected").length;
    if (failedNotifications) {
      console.error("Reservation notification delivery failed:", failedNotifications);
    }

    return NextResponse.json({
      ok: true,
      reference,
      notificationStatus: notificationTasks.length === 0 ? "not_configured" : failedNotifications ? "partial_or_failed" : "accepted_by_provider",
    }, { status: 201 });
  } catch (error) {
    console.error("Reservation request error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "The reservation service is temporarily unavailable. Please contact the hotel directly." }, { status: 503 });
  }
}
