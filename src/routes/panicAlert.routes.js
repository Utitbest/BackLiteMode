import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  triggerPanicAlert,
  getActiveAlerts,
  resolveAlert,
  getMyActiveAlert,
} from "../controllers/panicAlert.controller.js";

const router = express.Router();

router.use(protect);

router.post("/", triggerPanicAlert);
router.get("/active", getActiveAlerts);
router.get("/mine", getMyActiveAlert);
router.patch("/:id/resolve", resolveAlert);

export default router;