import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  getWorkOrders,
  createWorkOrder,
  getWorkOrderById,
  updateStatus,
  submitFeedback,
  getAssignableUsers,
} from "../controllers/workOrder.controller.js";

const router = express.Router();

router.use(protect); // every role can reach these — scoping happens inside the controller, not by role gate

router.get("/", getWorkOrders);
router.post("/", createWorkOrder);
router.get("/assignable-users", getAssignableUsers); // must stay above /:id
router.get("/:id", getWorkOrderById);
router.patch("/:id/status", updateStatus);
router.post("/:id/feedback", submitFeedback);

export default router;