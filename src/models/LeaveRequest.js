import mongoose from "mongoose";

const leaveRequestSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    leaveType: {
      type: String,
      enum: ["Annual", "Sick", "Casual", "Maternity/Paternity", "Unpaid", "Other"],
      default: "Annual",
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, trim: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, trim: true },
    site: { type: mongoose.Schema.Types.ObjectId, ref: "Site", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("LeaveRequest", leaveRequestSchema);