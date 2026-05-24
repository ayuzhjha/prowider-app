/**
 * POST /api/leads
 * Creates a new lead and triggers provider allocation.
 *
 * Duplicate check: compound unique index on (phone, serviceId) in MongoDB.
 * Returns 409 if duplicate, 201 with lead data on success.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Lead from "@/lib/models/Lead";
import { allocateProviders } from "@/lib/allocation";
import { broadcastDashboardUpdate } from "@/lib/sse";
import { z } from "zod";

const LeadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z
    .string()
    .min(10, "Phone must be at least 10 digits")
    .regex(/^\d+$/, "Phone must contain only digits"),
  city: z.string().min(1, "City is required"),
  serviceId: z.number().int().min(1).max(3),
  description: z.string().min(1, "Description is required"),
});

const SERVICE_NAMES: Record<number, string> = {
  1: "Service 1",
  2: "Service 2",
  3: "Service 3",
};

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const parsed = LeadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, phone, city, serviceId, description } = parsed.data;

    // Allocate providers BEFORE saving (so we can include them atomically)
    // Allocation itself is atomic via MongoDB ops
    const assignedProviders = await allocateProviders(serviceId);

    // Create lead with assigned providers
    let lead;
    try {
      lead = await Lead.create({
        name,
        phone,
        city,
        serviceId,
        serviceName: SERVICE_NAMES[serviceId],
        description,
        assignedProviders,
      });
    } catch (err: unknown) {
      // MongoDB duplicate key error (E11000) for (phone, serviceId)
      if (
        err instanceof Error &&
        "code" in err &&
        (err as { code: number }).code === 11000
      ) {
        return NextResponse.json(
          {
            error: "Duplicate lead",
            message: `A lead for ${SERVICE_NAMES[serviceId]} already exists for this phone number.`,
          },
          { status: 409 }
        );
      }
      throw err;
    }

    // Broadcast real-time update to all connected dashboard clients
    broadcastDashboardUpdate({
      type: "new_lead",
      leadId: lead._id.toString(),
      serviceId,
      assignedProviders,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        lead: {
          id: lead._id.toString(),
          name: lead.name,
          phone: lead.phone,
          city: lead.city,
          serviceId: lead.serviceId,
          serviceName: lead.serviceName,
          assignedProviders: lead.assignedProviders,
          createdAt: lead.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/leads] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
