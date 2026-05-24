import mongoose, { Schema, Document, Model } from "mongoose";

export interface IService extends Document {
  serviceId: number;
  name: string;
}

const ServiceSchema = new Schema<IService>({
  serviceId: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
});

const Service: Model<IService> =
  mongoose.models.Service || mongoose.model<IService>("Service", ServiceSchema);

export default Service;
