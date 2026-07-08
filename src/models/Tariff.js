import mongoose from "mongoose";

const tariffSchema = new mongoose.Schema(
  {
    site: { type: mongoose.Schema.Types.ObjectId, ref: "Site", required: true, unique: true },
    energyRate: { type: Number, default: 0 }, // ₦ per kWh·m²
    waterRate: { type: Number, default: 0 }, // ₦ per m³
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Tariff", tariffSchema);