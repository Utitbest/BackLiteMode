import mongoose from "mongoose";

export const ROLES = [
  "SUPER_ADMIN_1",
  "SUPER_ADMIN_2",
  "OPERATIONS_MANAGER",
  "FACILITY_MANAGER",
  "HR",
  "SECURITY",
  "TECHNICIAN",
  "RESIDENT",
];

const userSchema = new mongoose.Schema(
  {
    companyName: { type: String, trim: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    password: { type: String, required: true, select: false },

    role: { type: String, enum: ROLES, default: "RESIDENT" },

    site: { type: mongoose.Schema.Types.ObjectId, ref: "Site", default: null },
    requestedSiteName: { type: String, trim: true },
    siteStatus: {
      type: String,
      enum: ["pending", "assigned", "rejected", "not_applicable"],
      default: "pending",
    },

    isEmailVerified: { type: Boolean, default: false },
    emailVerificationCode: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    passwordChangedAt: { type: Date, select: false },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;