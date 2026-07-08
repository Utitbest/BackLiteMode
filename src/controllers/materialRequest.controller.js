import MaterialRequest from "../models/MaterialRequest.js";
import WorkOrder from "../models/WorkOrder.js";
import { getRequiredTier, canApprove } from "../utils/approvalTiers.js";
import Inventory from "../models/Inventory.js";
const SUPER_ADMIN_ROLES = ["SUPER_ADMIN_1", "SUPER_ADMIN_2"];

function scopeFilter(user) {
  return SUPER_ADMIN_ROLES.includes(user.role) ? {} : { site: user.site };
}

export function getMaterialRequests(req, res, next) {
  MaterialRequest.find({ workOrder: req.params.workOrderId })
    .sort({ createdAt: -1 })
    .then((requests) => res.status(200).json({ success: true, data: requests }))
    .catch(next);
}

export function createMaterialRequest(req, res, next) {
  const { itemName, quantity, unit, notes, estCost } = req.body;

  WorkOrder.findById(req.params.workOrderId)
    .then((workOrder) => {
      if (!workOrder) {
        const error = new Error("Work order not found");
        error.statusCode = 404;
        throw error;
      }

      const attachmentUrl = req.file ? `/uploads/materials/${req.file.filename}` : null;
      const attachmentName = req.file ? req.file.originalname : null;

      return MaterialRequest.create({
        workOrder: workOrder._id,
        site: workOrder.site,
        itemName,
        quantity,
        unit,
        notes,
        estCost: estCost || 0,
        attachmentUrl,
        attachmentName,
        requestedBy: req.user._id,
      });
    })
    .then((request) => res.status(201).json({ success: true, data: request }))
    .catch(next);
}

// Procurement-wide list — every request across the site(s), not scoped to one work order
export function getAllMaterialRequests(req, res, next) {
  MaterialRequest.find(scopeFilter(req.user))
    .populate("workOrder", "title")
    .populate("requestedBy", "fullName")
    .populate("vendor", "name")
    .sort({ createdAt: -1 })
    .then((requests) => {
      const withTier = requests.map((r) => ({
        ...r.toObject(),
        requiredTier: getRequiredTier(r.estCost).label,
      }));
      res.status(200).json({ success: true, data: withTier });
    })
    .catch(next);
}

export function approveRequest(req, res, next) {
  MaterialRequest.findOne({ _id: req.params.id, ...scopeFilter(req.user) })
    .then((request) => {
      if (!request) {
        const error = new Error("Request not found");
        error.statusCode = 404;
        throw error;
      }
      if (request.status !== "requested") {
        const error = new Error("Only pending requests can be approved");
        error.statusCode = 400;
        throw error;
      }
      if (!canApprove(req.user.role, request.estCost)) {
        const tier = getRequiredTier(request.estCost);
        const error = new Error(`This request requires ${tier.label} approval or higher`);
        error.statusCode = 403;
        throw error;
      }

      request.status = "approved";
      request.approvedBy = req.user._id;
      request.approvedAt = new Date();
      return request.save();
    })
    .then((request) => res.status(200).json({ success: true, data: request }))
    .catch(next);
}

export function rejectRequest(req, res, next) {
  const { reason } = req.body;

  MaterialRequest.findOne({ _id: req.params.id, ...scopeFilter(req.user) })
    .then((request) => {
      if (!request) {
        const error = new Error("Request not found");
        error.statusCode = 404;
        throw error;
      }
      if (!canApprove(req.user.role, request.estCost)) {
        const tier = getRequiredTier(request.estCost);
        const error = new Error(`This request requires ${tier.label} approval or higher`);
        error.statusCode = 403;
        throw error;
      }

      request.status = "rejected";
      request.rejectedBy = req.user._id;
      request.rejectionReason = reason;
      return request.save();
    })
    .then((request) => res.status(200).json({ success: true, data: request }))
    .catch(next);
}

export function markOrdered(req, res, next) {
  const { vendorId, poNumber } = req.body;

  if (!vendorId || !poNumber) {
    const error = new Error("Vendor and PO number are required to mark as ordered");
    error.statusCode = 400;
    return next(error);
  }

  MaterialRequest.findOne({ _id: req.params.id, ...scopeFilter(req.user) })
    .then((request) => {
      if (!request) {
        const error = new Error("Request not found");
        error.statusCode = 404;
        throw error;
      }
      if (request.status !== "approved") {
        const error = new Error("Only approved requests can be marked as ordered");
        error.statusCode = 400;
        throw error;
      }

      request.status = "ordered";
      request.vendor = vendorId;
      request.poNumber = poNumber;
      request.orderedAt = new Date();
      return request.save();
    })
    .then((request) => res.status(200).json({ success: true, data: request }))
    .catch(next);
}

export function markReceived(req, res, next) {
  MaterialRequest.findOne({ _id: req.params.id, ...scopeFilter(req.user) })
    .then((request) => {
      if (!request) {
        const error = new Error("Request not found");
        error.statusCode = 404;
        throw error;
      }
      if (request.status !== "ordered") {
        const error = new Error("Only ordered requests can be marked as received");
        error.statusCode = 400;
        throw error;
      }

      request.status = "received";
      request.receivedAt = new Date();
      return request.save();
    })
    .then((request) => res.status(200).json({ success: true, data: request }))
    .catch(next);
}

export function directPurchase(req, res, next) {
  const { actualCost } = req.body;

  MaterialRequest.findOne({ _id: req.params.id, ...scopeFilter(req.user) })
    .then((request) => {
      if (!request) {
        const error = new Error("Request not found");
        error.statusCode = 404;
        throw error;
      }
      if (request.status !== "approved") {
        const error = new Error("Only approved requests can be directly purchased");
        error.statusCode = 400;
        throw error;
      }

      const receiptUrl = req.file ? `/uploads/receipts/${req.file.filename}` : null;
      const receiptName = req.file ? req.file.originalname : null;

      request.status = "purchased";
      request.fulfillmentMethod = "direct_purchase";
      request.purchasedBy = req.user._id;
      request.actualCost = actualCost || request.estCost;
      request.receiptUrl = receiptUrl;
      request.receiptName = receiptName;
      request.purchasedAt = new Date();
      return request.save();
    })
    .then((request) => res.status(200).json({ success: true, data: request }))
    .catch(next);
}

export function pickFromInventory(req, res, next) {
  const { inventoryItemId } = req.body;

  MaterialRequest.findOne({ _id: req.params.id, ...scopeFilter(req.user) })
    .then((request) => {
      if (!request) {
        const error = new Error("Request not found");
        error.statusCode = 404;
        throw error;
      }
      if (request.status !== "approved") {
        const error = new Error("Only approved requests can be fulfilled from inventory");
        error.statusCode = 400;
        throw error;
      }

      return Inventory.findById(inventoryItemId).then((invItem) => {
        if (!invItem) {
          const error = new Error("Inventory item not found");
          error.statusCode = 404;
          throw error;
        }
        if (invItem.quantity < request.quantity) {
          const error = new Error(
            `Not enough stock — only ${invItem.quantity} ${invItem.unit} available`
          );
          error.statusCode = 400;
          throw error;
        }

        invItem.quantity -= request.quantity;

        request.status = "received";
        request.fulfillmentMethod = "inventory";
        request.inventoryItem = invItem._id;
        request.fulfilledFromInventoryAt = new Date();

        return Promise.all([invItem.save(), request.save()]).then(([, savedRequest]) => savedRequest);
      });
    })
    .then((request) => res.status(200).json({ success: true, data: request }))
    .catch(next);
}