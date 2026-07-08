import mongoose from "mongoose";

const materialRequestSchema = new mongoose.Schema(
  {
    workOrder: { type: mongoose.Schema.Types.ObjectId, ref: "WorkOrder", required: true },
    itemName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, default: 1 },
    unit: { type: String, default: "pcs" },
    notes: { type: String, trim: true },
    estCost: { type: Number, default: 0 },
    attachmentUrl: { type: String, default: null },
    attachmentName: { type: String, default: null },
    status: {
      type: String,
      enum: ["requested", "approved", "rejected", "ordered", "received", "purchased"],
      default: "requested",
    },
    fulfillmentMethod: {
      type: String,
      enum: ["vendor", "direct_purchase", "inventory", null],
      default: null,
    },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    site: { type: mongoose.Schema.Types.ObjectId, ref: "Site", required: true },

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    rejectionReason: { type: String, trim: true },

    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", default: null },
    poNumber: { type: String, default: null },
    orderedAt: { type: Date, default: null },
    receivedAt: { type: Date, default: null },


    // Direct purchase fields
    purchasedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    actualCost: { type: Number, default: null },
    receiptUrl: { type: String, default: null },
    receiptName: { type: String, default: null },
    purchasedAt: { type: Date, default: null },

    // Inventory fulfillment fields
    inventoryItem: { type: mongoose.Schema.Types.ObjectId, ref: "Inventory", default: null },
    fulfilledFromInventoryAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("MaterialRequest", materialRequestSchema);