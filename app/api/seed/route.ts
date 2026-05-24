/**
 * POST /api/seed
 * Seeds the database with initial data.
 * Only works if the database is empty or on explicit override.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Service from "@/lib/models/Service";
import Provider from "@/lib/models/Provider";
import AllocationState from "@/lib/models/AllocationState";
import Lead from "@/lib/models/Lead";
import WebhookEvent from "@/lib/models/WebhookEvent";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));
    const force = body.force === true;

    const existingProviders = await Provider.countDocuments();
    if (existingProviders > 0 && !force) {
      return NextResponse.json({
        success: true,
        message: "Database already seeded. Pass force: true to re-seed.",
        alreadySeeded: true,
      });
    }

    // Clear all collections
    await Promise.all([
      Service.deleteMany({}),
      Provider.deleteMany({}),
      AllocationState.deleteMany({}),
      Lead.deleteMany({}),
      WebhookEvent.deleteMany({}),
    ]);

    // Insert services
    await Service.insertMany([
      { serviceId: 1, name: "Service 1" },
      { serviceId: 2, name: "Service 2" },
      { serviceId: 3, name: "Service 3" },
    ]);

    // Insert providers
    const providers = Array.from({ length: 8 }, (_, i) => ({
      providerId: i + 1,
      name: `Provider ${i + 1}`,
      monthlyQuota: 10,
      leadsReceived: 0,
    }));
    await Provider.insertMany(providers);

    // Insert allocation state
    await AllocationState.insertMany([
      { serviceId: 1, pool: [2, 3, 4], nextIndex: 0 },
      { serviceId: 2, pool: [6, 7, 8], nextIndex: 0 },
      { serviceId: 3, pool: [2, 3, 5, 6, 7, 8], nextIndex: 0 },
    ]);

    return NextResponse.json({
      success: true,
      message: "Database seeded successfully.",
      seeded: {
        services: 3,
        providers: 8,
        allocationStates: 3,
      },
    });
  } catch (error) {
    console.error("[POST /api/seed] Error:", error);
    return NextResponse.json(
      { error: "Seed failed: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
