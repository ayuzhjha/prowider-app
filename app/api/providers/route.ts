/**
 * GET /api/providers
 * Returns all providers with their stats and assigned leads.
 */

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Provider from "@/lib/models/Provider";
import Lead from "@/lib/models/Lead";

export async function GET() {
  try {
    await connectDB();

    const providers = await Provider.find().sort({ providerId: 1 }).lean();
    const leads = await Lead.find().sort({ createdAt: -1 }).lean();

    const providerData = providers.map((provider) => {
      const assignedLeads = leads.filter((lead) =>
        lead.assignedProviders.includes(provider.providerId)
      );

      return {
        providerId: provider.providerId,
        name: provider.name,
        monthlyQuota: provider.monthlyQuota,
        leadsReceived: provider.leadsReceived,
        quotaRemaining: provider.monthlyQuota,
        assignedLeads: assignedLeads.map((lead) => ({
          id: lead._id.toString(),
          name: lead.name,
          phone: lead.phone,
          city: lead.city,
          serviceId: lead.serviceId,
          serviceName: lead.serviceName,
          description: lead.description,
          createdAt: lead.createdAt,
        })),
      };
    });

    return NextResponse.json({ providers: providerData });
  } catch (error) {
    console.error("[GET /api/providers] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
