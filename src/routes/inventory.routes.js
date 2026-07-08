import express from "express";
import { protect, authorize } from "../middleware/auth.middleware.js";
import { getInventory, createInventoryItem, adjustStock } from "../controllers/inventory.controller.js";

const router = express.Router();

router.use(protect, authorize("SUPER_ADMIN_1", "SUPER_ADMIN_2", "OPERATIONS_MANAGER", "FACILITY_MANAGER"));

router.get("/", getInventory);
router.post("/", createInventoryItem);
router.patch("/:id/adjust", adjustStock);

export default router;