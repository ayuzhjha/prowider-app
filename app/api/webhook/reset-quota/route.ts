/**
 * POST /api/webhook/reset-quota
 *
 * Idempotent webhook endpoint that resets all provider monthly quotas to 10.
 * Simulates a payment gateway confirming a subscription renewal.
 *
 * Idempotency:
 * - Caller must provide a unique `eventId` in the request body
 * - We store processed eventIds in the webhook_events collection
 * - The unique index on eventId guarantees at-most-once processing
 * - Duplicate calls return 200 with { alreadyProcessed: true }
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Provider from "@/lib/models/Provider";
import WebhookEvent from "@/lib/models/WebhookEvent";
import AllocationState from "@/lib/models/AllocationState";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { eventId } = body;

    if (!eventId || typeof eventId !== "string") {
      return NextResponse.json(
        { error: "eventId is required and must be a string" },
        { status: 400 }
      );
    }

    // Attempt to insert webhook event record (idempotency check)
    // If eventId already exists, MongoDB throws E11000 (duplicate key)
    try {
      await WebhookEvent.create({
        eventId,
        type: "quota_reset",
        processedAt: new Date(),
      });
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        "code" in err &&
        (err as { code: number }).code === 11000
      ) {
        // Already processed — return success without side effects
        return NextResponse.json({
          success: true,
          alreadyProcessed: true,
          message: `Webhook event ${eventId} was already processed. No changes made.`,
        });
      }
      throw err;
    }

    // Reset all provider quotas to 10 and leadsReceived to 0
    await Provider.updateMany(
      {},
      { $set: { monthlyQuota: 10, leadsReceived: 0 } }
    );

    // Reset allocation round-robin indices
    await AllocationState.updateMany({}, { $set: { nextIndex: 0 } });

    return NextResponse.json({
      success: true,
      alreadyProcessed: false,
      message: "All provider quotas reset to 10 successfully.",
      eventId,
    });
  } catch (error) {
    console.error("[POST /api/webhook/reset-quota] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
