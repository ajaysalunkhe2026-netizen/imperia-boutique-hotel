import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("expire_booking_holds", {
      p_batch_size: 100,
    });
    if (error || typeof data !== "number") {
      return NextResponse.json({ error: "expiry_job_failed" }, { status: 503 });
    }
    return NextResponse.json(
      { expired_holds: data },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "expiry_job_failed" }, { status: 503 });
  }
}
