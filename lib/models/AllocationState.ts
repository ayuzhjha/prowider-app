import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAllocationState extends Document {
  serviceId: number;
  pool: number[]; // eligible provider IDs for fair distribution
  nextIndex: number; // persistent round-robin pointer
}

const AllocationStateSchema = new Schema<IAllocationState>({
  serviceId: { type: Number, required: true, unique: true },
  pool: { type: [Number], required: true },
  nextIndex: { type: Number, required: true, default: 0 },
});

const AllocationState: Model<IAllocationState> =
  mongoose.models.AllocationState ||
  mongoose.model<IAllocationState>("AllocationState", AllocationStateSchema);

export default AllocationState;
