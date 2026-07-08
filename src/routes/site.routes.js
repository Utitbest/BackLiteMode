import express from "express";
import { protect, authorize } from "../middleware/auth.middleware.js";
import Site from "../models/Site.js";

const router = express.Router();

router.get("/", (req, res, next) => {
  Site.find({ status: "active" })
    .then((sites) => res.status(200).json({ success: true, data: sites }))
    .catch(next);
});

router.post("/", protect, authorize("SUPER_ADMIN_1", "SUPER_ADMIN_2"), (req, res, next) => {
  Site.create({ ...req.body, createdBy: req.user._id })
    .then((site) => res.status(201).json({ success: true, data: site }))
    .catch(next);
});

export default router;