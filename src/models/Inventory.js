import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema(
  {
    itemName: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: "General" },
    quantity: { type: Number, required: true, default: 0, min: 0 },
    unit: { type: String, default: "pcs" },
    reorderThreshold: { type: Number, default: 0 },
    site: { type: mongoose.Schema.Types.ObjectId, ref: "Site", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Inventory", inventorySchema);