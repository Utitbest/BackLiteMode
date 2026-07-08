import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { uploadMaterialFile } from "../middleware/materialUpload.middleware.js";
import { getMaterialRequests, createMaterialRequest } from "../controllers/materialRequest.controller.js";

const router = express.Router({ mergeParams: true }); // needed to access :workOrderId from the parent mount

router.use(protect);

router.get("/", getMaterialRequests);
router.post("/", uploadMaterialFile.single("attachment"), createMaterialRequest);

export default router;