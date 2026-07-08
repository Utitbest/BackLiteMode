import mongoose from "mongoose";

const propertySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. "Marina Heights Block A"
    type: {
      type: String,
      enum: ["residential", "commercial", "mixed-use", "industrial"],
      default: "residential",
    },
    address: { type: String, trim: true },
    totalUnits: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    site: { type: mongoose.Schema.Types.ObjectId, ref: "Site", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Property", propertySchema);