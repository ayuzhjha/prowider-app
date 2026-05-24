/**
 * Database seed script
 * Run with: npx tsx seed/seed.ts
 *
 * Seeds:
 * - 3 Services
 * - 8 Providers (each with quota=10)
 * - AllocationState per service (round-robin index starts at 0)
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) {
  throw new Error("MONGODB_URI not set in .env.local");
}

// ---- Inline schemas (avoid import issues in script context) ----

const ServiceSchema = new mongoose.Schema({
  serviceId: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
});

const ProviderSchema = new mongoose.Schema({
  providerId: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  monthlyQuota: { type: Number, required: true, default: 10 },
  leadsReceived: { type: Number, required: true, default: 0 },
});

const AllocationStateSchema = new mongoose.Schema({
  serviceId: { type: Number, required: true, unique: true },
  pool: { type: [Number], required: true },
  nextIndex: { type: Number, required: true, default: 0 },
});

const LeadSchema = new mongoose.Schema(
  {
    name: String,
    phone: String,
    city: String,
    serviceId: Number,
    serviceName: String,
    description: String,
    assignedProviders: [Number],
  },
  { timestamps: true }
);
LeadSchema.index({ phone: 1, serviceId: 1 }, { unique: true });

const WebhookEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  processedAt: { type: Date, required: true, default: Date.now },
});

async function seed() {
  console.log("🌱 Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected");

  const Service = mongoose.models.Service || mongoose.model("Service", ServiceSchema);
  const Provider = mongoose.models.Provider || mongoose.model("Provider", ProviderSchema);
  const AllocationState = mongoose.models.AllocationState || mongoose.model("AllocationState", AllocationStateSchema);
  const Lead = mongoose.models.Lead || mongoose.model("Lead", LeadSchema);
  const WebhookEvent = mongoose.models.WebhookEvent || mongoose.model("WebhookEvent", WebhookEventSchema);

  // Clear existing data
  console.log("🗑️  Clearing existing data...");
  await Service.deleteMany({});
  await Provider.deleteMany({});
  await AllocationState.deleteMany({});
  await Lead.deleteMany({});
  await WebhookEvent.deleteMany({});

  // Seed Services
  console.log("📋 Seeding services...");
  await Service.insertMany([
    { serviceId: 1, name: "Service 1" },
    { serviceId: 2, name: "Service 2" },
    { serviceId: 3, name: "Service 3" },
  ]);

  // Seed Providers
  console.log("👥 Seeding providers...");
  const providers = Array.from({ length: 8 }, (_, i) => ({
    providerId: i + 1,
    name: `Provider ${i + 1}`,
    monthlyQuota: 10,
    leadsReceived: 0,
  }));
  await Provider.insertMany(providers);

  // Seed AllocationState (round-robin pools per service)
  console.log("🔄 Seeding allocation state...");
  await AllocationState.insertMany([
    { serviceId: 1, pool: [2, 3, 4], nextIndex: 0 },
    { serviceId: 2, pool: [6, 7, 8], nextIndex: 0 },
    { serviceId: 3, pool: [2, 3, 5, 6, 7, 8], nextIndex: 0 },
  ]);

  console.log("✅ Seed complete!");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
