import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { getDashboardSummary } from "../controllers/dashboard.controller.js";

const router = express.Router();

router.get("/summary", protect, getDashboardSummary);

export default router;