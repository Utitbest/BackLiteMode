import mongoose from "mongoose";

export const DEPARTMENTS = [
  "Facilities", "Operations", "Security", "Housekeeping", "Engineering",
  "Administration", "Finance", "HR", "IT", "Front Desk",
];

const employeeSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    office: { type: String, enum: DEPARTMENTS, default: "Operations" },
    employeePin: { type: String, required: true }, // doubles as staff_id
    jobTitle: { type: String, trim: true },
    NIN: { type: String, trim: true, default: null },
    joinDate: { type: Date, default: Date.now },
    status: { type: String, enum: ["onboarding", "active", "inactive"], default: "onboarding" },
    workMode: { type: String, enum: ["office", "remote"], default: "office" },

    // Filled later by the employee on their own self-onboarding page
    salary: { type: Number, default: null },
    bankName: { type: String, trim: true, default: null },
    accountName: { type: String, trim: true, default: null },
    accountNumber: { type: String, trim: true, default: null },
    employeeDocumentUrl: { type: String, default: null },
    employeeDocumentName: { type: String, default: null },
    selfOnboardingCompleted: { type: Boolean, default: false },

    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    site: { type: mongoose.Schema.Types.ObjectId, ref: "Site", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

employeeSchema.index({ site: 1, employeePin: 1 }, { unique: true });

export default mongoose.model("Employee", employeeSchema);