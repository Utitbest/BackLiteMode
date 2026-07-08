import mongoose from "mongoose";

const wfhTaskSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    dueDate: { type: Date },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    site: { type: mongoose.Schema.Types.ObjectId, ref: "Site", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("WfhTask", wfhTaskSchema);