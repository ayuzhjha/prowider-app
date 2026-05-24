/**
 * POST /api/test/gen-leads
 *
 * Test endpoint: generates N leads concurrently to test concurrency safety.
 * Used from the /test-tools page.
 *
 * This simulates multiple customers submitting forms simultaneously.
 * Each lead gets a unique random phone number to avoid duplicate conflicts.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Lead from "@/lib/models/Lead";
import { allocateProviders } from "@/lib/allocation";
import { broadcastDashboardUpdate } from "@/lib/sse";

const CITIES = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Pune", "Hyderabad", "Kolkata", "Ahmedabad"];
const NAMES = ["Arjun Sharma", "Priya Patel", "Rahul Kumar", "Ananya Singh", "Vikram Mehta", "Deepa Nair", "Saurabh Gupta", "Kavita Reddy", "Amit Joshi", "Neha Verma"];
const DESCRIPTIONS = [
  "Need urgent assistance with the service",
  "Looking for a reliable provider in my area",
  "Referred by a friend, need a quote",
  "Have been looking for this service for a while",
  "Need this done as soon as possible",
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPhone(): string {
  return "9" + Math.floor(Math.random() * 1000000000).toString().padStart(9, "0");
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));
    const count = Math.min(Number(body.count) || 10, 20); // max 20

    // Generate all lead data first
    const leadInputs = Array.from({ length: count }, (_, i) => ({
      name: randomItem(NAMES),
      phone: randomPhone(),
      city: randomItem(CITIES),
      serviceId: ((i % 3) + 1) as 1 | 2 | 3, // cycle through services
      serviceName: `Service ${(i % 3) + 1}`,
      description: randomItem(DESCRIPTIONS),
    }));

    // Fire all lead creations concurrently
    const results = await Promise.allSettled(
      leadInputs.map(async (input) => {
        const assignedProviders = await allocateProviders(input.serviceId);
        const lead = await Lead.create({
          ...input,
          assignedProviders,
        });

        broadcastDashboardUpdate({
          type: "new_lead",
          leadId: lead._id.toString(),
          serviceId: input.serviceId,
          assignedProviders,
          timestamp: new Date().toISOString(),
        });

        return {
          id: lead._id.toString(),
          name: input.name,
          serviceId: input.serviceId,
          assignedProviders,
        };
      })
    );

    const successful = results
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<unknown>).value);

    const failed = results
      .filter((r) => r.status === "rejected")
      .map((r) => (r as PromiseRejectedResult).reason?.message || "Unknown error");

    return NextResponse.json({
      success: true,
      requested: count,
      created: successful.length,
      failed: failed.length,
      leads: successful,
      errors: failed,
    });
  } catch (error) {
    console.error("[POST /api/test/gen-leads] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
