import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProvider extends Document {
  providerId: number;
  name: string;
  monthlyQuota: number;
  leadsReceived: number;
}

const ProviderSchema = new Schema<IProvider>({
  providerId: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  monthlyQuota: { type: Number, required: true, default: 10 },
  leadsReceived: { type: Number, required: true, default: 0 },
});

const Provider: Model<IProvider> =
  mongoose.models.Provider ||
  mongoose.model<IProvider>("Provider", ProviderSchema);

export default Provider;
