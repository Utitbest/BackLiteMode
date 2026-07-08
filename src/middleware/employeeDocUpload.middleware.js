import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = "uploads/employee-docs";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const allowedTypes = [".pdf", ".jpg", ".jpeg", ".png", ".docx"];

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) cb(null, true);
  else cb(new Error("Only PDF, DOCX, JPG, and PNG files are allowed"));
}

export const uploadEmployeeDoc = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });