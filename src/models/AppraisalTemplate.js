import mongoose from "mongoose";

const criterionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    weight: { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false }
);

const appraisalTemplateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    criteria: { type: [criterionSchema], default: [] },
    site: { type: mongoose.Schema.Types.ObjectId, ref: "Site", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("AppraisalTemplate", appraisalTemplateSchema);