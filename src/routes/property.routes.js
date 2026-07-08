import express from "express";
import { protect, authorize } from "../middleware/auth.middleware.js";
import { getProperties, createProperty } from "../controllers/property.controller.js";

const router = express.Router();

router.use(protect, authorize("SUPER_ADMIN_1", "SUPER_ADMIN_2", "OPERATIONS_MANAGER", "FACILITY_MANAGER"));

router.get("/", getProperties);
router.post("/", createProperty);

export default router;