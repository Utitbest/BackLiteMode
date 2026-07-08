import mongoose from "mongoose";

const meterSchema = new mongoose.Schema(
  {
    meterNumber: { type: String, required: true, trim: true },
    type: { type: String, enum: ["energy", "water"], required: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true },
    spaceArea: { type: Number, required: true },
    location: { type: String, trim: true },
    initialReading: { type: Number, default: 0 },
    notes: { type: String, trim: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    site: { type: mongoose.Schema.Types.ObjectId, ref: "Site", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Meter", meterSchema);