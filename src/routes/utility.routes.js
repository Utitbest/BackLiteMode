import express from "express";
import { protect, authorize } from "../middleware/auth.middleware.js";
import { getTariff, saveTariff } from "../controllers/tariff.controller.js";
import {
  getMeters,
  createMeter,
  getMeterById,
  recordReading,
  getDashboardStats,
  getTenantsUtilitySummary, 
  getTenantUtilityHistory
} from "../controllers/meter.controller.js";
import { generateInvoice } from "../controllers/invoice.controller.js";
const router = express.Router();
router.use(protect, authorize("SUPER_ADMIN_1", "SUPER_ADMIN_2", "OPERATIONS_MANAGER", "FACILITY_MANAGER"));

router.get("/tariff", getTariff);
router.post("/tariff", saveTariff);
router.post("/invoice", generateInvoice);
router.get("/meters", getMeters);
router.post("/meters", createMeter);
router.get("/meters/dashboard", getDashboardStats); // must stay above /meters/:id
router.get("/meters/:id", getMeterById);
router.get("/tenants", getTenantsUtilitySummary);
router.get("/tenants/:tenantId", getTenantUtilityHistory);
router.post("/meters/:id/readings", recordReading);

export default router;