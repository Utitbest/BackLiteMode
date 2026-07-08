import express from "express";
import { protect, authorize } from "../middleware/auth.middleware.js";
import { uploadSla } from "../middleware/upload.middleware.js";
import {
  getTenants,
  createTenant,
  getTenantById,
  updateTenant,
  uploadTenantSla,
  addExpense,
  updateReminders,
} from "../controllers/tenant.controller.js";

const router = express.Router();

router.use(protect, authorize("SUPER_ADMIN_1", "SUPER_ADMIN_2", "OPERATIONS_MANAGER", "FACILITY_MANAGER"));

router.get("/", getTenants);
router.post("/", createTenant);
router.get("/:id", getTenantById);
router.patch("/:id", updateTenant);
router.post("/:id/sla", uploadSla.single("slaFile"), uploadTenantSla);
router.post("/:id/expenses", addExpense);
router.patch("/:id/reminders", updateReminders);

export default router;