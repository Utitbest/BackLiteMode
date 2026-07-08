import mongoose from "mongoose";

const tenantSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    company: { type: String, trim: true },

    property: { type: mongoose.Schema.Types.ObjectId, ref: "Property", default: null },
    site: { type: mongoose.Schema.Types.ObjectId, ref: "Site", required: true },

    status: { type: String, enum: ["active", "inactive"], default: "active" },

    movingInDate: { type: Date },
    currency: { type: String, default: "NGN" },
    leaseStart: { type: Date },
    leaseEnd: { type: Date },
    leaseAmount: { type: Number, default: 0 },
    serviceCharge: { type: Number, default: 0 },
    securityDeposit: { type: Number, default: 0 },
    leaseDuration: { type: String, trim: true },

    slaFileUrl: { type: String, default: null },
    slaFileName: { type: String, default: null },

    serviceChargeDueDate: { type: Date },
    reminderMonthsBefore: { type: Number, min: 1, max: 11, default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Tenant", tenantSchema);