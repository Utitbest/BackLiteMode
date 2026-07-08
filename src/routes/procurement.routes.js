import express from "express";
import { protect, authorize } from "../middleware/auth.middleware.js";
import {
  getAllMaterialRequests,
  approveRequest,
  rejectRequest,
  markOrdered,
  markReceived,
} from "../controllers/materialRequest.controller.js";
import { getVendors, createVendor } from "../controllers/vendor.controller.js";
import { uploadReceipt } from "../middleware/receiptUpload.middleware.js";
import { directPurchase, pickFromInventory } from "../controllers/materialRequest.controller.js"; // add to existing import
const router = express.Router();

router.use(protect, authorize("SUPER_ADMIN_1", "SUPER_ADMIN_2", "OPERATIONS_MANAGER", "FACILITY_MANAGER"));

router.get("/requests", getAllMaterialRequests);
router.patch("/requests/:id/approve", approveRequest);
router.patch("/requests/:id/reject", rejectRequest);
router.patch("/requests/:id/order", markOrdered);
router.patch("/requests/:id/receive", markReceived);
router.patch("/requests/:id/direct-purchase", uploadReceipt.single("receipt"), directPurchase);
router.patch("/requests/:id/pick-inventory", pickFromInventory);
router.get("/vendors", getVendors);
router.post("/vendors", createVendor);

export default router;