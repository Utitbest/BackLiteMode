import mongoose from "mongoose";

export const ASSET_CATEGORIES = [
  "HVAC", "Electrical", "Plumbing", "IT Equipment", "Furniture",
  "Vehicles", "Security", "Cleaning Equipment", "Generator", "Elevator", "Fire Safety", "Other",
];
export const ASSET_STATUSES = ["Active", "Under Maintenance", "Retired", "Lost/Disposed"];

const assetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: ASSET_CATEGORIES, default: "Other" },
    status: { type: String, enum: ASSET_STATUSES, default: "Active" },
    location: { type: String, required: true, trim: true },
    serialNumber: { type: String, trim: true },
    assignedProperty: { type: mongoose.Schema.Types.ObjectId, ref: "Property", default: null },
    manufacturer: { type: String, trim: true },
    model: { type: String, trim: true },
    purchaseDate: { type: Date },
    purchaseCost: { type: Number, default: 0 },
    warrantyExpiry: { type: Date },
    imageUrl: { type: String, trim: true },
    notes: { type: String, trim: true },
    site: { type: mongoose.Schema.Types.ObjectId, ref: "Site", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Asset", assetSchema);