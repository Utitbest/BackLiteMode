import express from "express";
import { protect, authorize } from "../middleware/auth.middleware.js";
import { uploadExcel } from "../middleware/excelUpload.middleware.js";
import {
  getAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  downloadTemplate,
  importAssets,
} from "../controllers/asset.controller.js";

const router = express.Router();

router.use(protect, authorize("SUPER_ADMIN_1", "SUPER_ADMIN_2", "OPERATIONS_MANAGER", "FACILITY_MANAGER"));

router.get("/", getAssets);
router.post("/", createAsset);
router.get("/template", downloadTemplate); // must stay above /:id
router.post("/import", uploadExcel.single("file"), importAssets);
router.patch("/:id", updateAsset);
router.delete("/:id", deleteAsset);

export default router;