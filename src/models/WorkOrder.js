import mongoose from "mongoose";

export const CATEGORIES = ["General Maintenance", "IT", "Security", "Electrical", "Plumbing", "HVAC", "Other"];
export const PRIORITIES = ["low", "medium", "high", "urgent"];
export const STATUSES = ["open", "assigned", "in_progress", "on_hold", "completed", "cancelled"];

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: STATUSES, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const workOrderSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, enum: CATEGORIES, default: "General Maintenance" },
    priority: { type: String, enum: PRIORITIES, default: "medium" },
    status: { type: String, enum: STATUSES, default: "open" },
    location: { type: String, trim: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: "Property", default: null },
    asset: { type: mongoose.Schema.Types.ObjectId, ref: "Asset", default: null },
    dueDate: { type: Date },

    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    site: { type: mongoose.Schema.Types.ObjectId, ref: "Site", required: true },

    estCost: { type: Number, default: 0 },
    actualCost: { type: Number, default: 0 },
    sendSmsAlert: { type: Boolean, default: false },

    statusHistory: [statusHistorySchema],

    feedback: {
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String, trim: true },
      submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      submittedAt: { type: Date },
    },
  },
  { timestamps: true }
);

export default mongoose.model("WorkOrder", workOrderSchema);