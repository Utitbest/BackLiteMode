import mongoose from "mongoose";

const panicAlertSchema = new mongoose.Schema(
  {
    triggeredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    location: { type: String, trim: true },
    status: { type: String, enum: ["active", "resolved"], default: "active" },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    resolvedAt: { type: Date, default: null },
    site: { type: mongoose.Schema.Types.ObjectId, ref: "Site", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("PanicAlert", panicAlertSchema);