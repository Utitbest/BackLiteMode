import mongoose from "mongoose";

const criterionScoreSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    weight: { type: Number, required: true },
    score: { type: Number, required: true, min: 0, max: 5 },
  },
  { _id: false }
);

const appraisalSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    template: { type: mongoose.Schema.Types.ObjectId, ref: "AppraisalTemplate", required: true },
    period: { type: String, required: true, trim: true }, // e.g. "Q2 2026"
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    criteriaScores: { type: [criterionScoreSchema], default: [] },
    overallRating: { type: Number, min: 0, max: 5, default: 0 },
    comment: { type: String, trim: true },
    status: { type: String, enum: ["draft", "submitted", "acknowledged"], default: "submitted" },
    acknowledgedAt: { type: Date, default: null },
    site: { type: mongoose.Schema.Types.ObjectId, ref: "Site", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Appraisal", appraisalSchema);