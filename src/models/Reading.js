import mongoose from "mongoose";

const readingSchema = new mongoose.Schema(
  {
    meter: { type: mongoose.Schema.Types.ObjectId, ref: "Meter", required: true },
    readingDate: { type: Date, required: true },
    value: { type: Number, required: true },
    previousValue: { type: Number, required: true },
    consumption: { type: Number, required: true },
    rateApplied: { type: Number, required: true },
    spaceAreaApplied: { type: Number, default: null }, // only meaningful for energy readings
    amount: { type: Number, required: true },
    comment: { type: String, trim: true },
    billed: { type: Boolean, default: false },
    billedAt: { type: Date, default: null },
    expense: { type: mongoose.Schema.Types.ObjectId, ref: "Expense", default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Reading", readingSchema);