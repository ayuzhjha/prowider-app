import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILead extends Document {
  name: string;
  phone: string;
  city: string;
  serviceId: number;
  serviceName: string;
  description: string;
  assignedProviders: number[];
  createdAt: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    city: { type: String, required: true },
    serviceId: { type: Number, required: true },
    serviceName: { type: String, required: true },
    description: { type: String, required: true },
    assignedProviders: { type: [Number], required: true, default: [] },
  },
  { timestamps: true }
);

// DB-level enforcement: same phone cannot create lead for same service
LeadSchema.index({ phone: 1, serviceId: 1 }, { unique: true });

const Lead: Model<ILead> =
  mongoose.models.Lead || mongoose.model<ILead>("Lead", LeadSchema);

export default Lead;
