import multer from "multer";
import path from "path";

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === ".xlsx" || ext === ".xls") cb(null, true);
  else cb(new Error("Only .xlsx or .xls files are allowed"));
}

export const uploadExcel = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });