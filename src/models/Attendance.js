import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    date: { type: String, required: true }, // stored as YYYY-MM-DD for easy per-day lookups
    checkIn: { type: Date, default: null },
    checkOut: { type: Date, default: null },
    status: { type: String, enum: ["present", "late"], default: "present" },
    site: { type: mongoose.Schema.Types.ObjectId, ref: "Site", required: true },
  },
  { timestamps: true }
);

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true }); // one record per employee per day

export default mongoose.model("Attendance", attendanceSchema);