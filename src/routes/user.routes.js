import express from "express";
import { protect, authorize } from "../middleware/auth.middleware.js";
import { getPendingUsers, assignUserToSite, rejectPendingUser } from "../controllers/user.controller.js";

const router = express.Router();

router.use(protect, authorize("SUPER_ADMIN_1", "SUPER_ADMIN_2"));

router.get("/pending", getPendingUsers);
router.patch("/:id/assign", assignUserToSite);
router.patch("/:id/reject", rejectPendingUser);

export default router;