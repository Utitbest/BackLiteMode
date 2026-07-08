import ExcelJS from "exceljs";
import Asset, { ASSET_CATEGORIES, ASSET_STATUSES } from "../models/Asset.js";
import Property from "../models/Property.js";

const SUPER_ADMIN_ROLES = ["SUPER_ADMIN_1", "SUPER_ADMIN_2"];

function scopeFilter(user) {
  return SUPER_ADMIN_ROLES.includes(user.role) ? {} : { site: user.site };
}

export function getAssets(req, res, next) {
  Asset.find(scopeFilter(req.user))
    .populate("assignedProperty", "name")
    .sort({ createdAt: -1 })
    .then((assets) => res.status(200).json({ success: true, data: assets }))
    .catch(next);
}

export function createAsset(req, res, next) {
  const { siteId, ...rest } = req.body;
  const isSuperAdmin = SUPER_ADMIN_ROLES.includes(req.user.role);
  const site = isSuperAdmin ? siteId : req.user.site;

  if (!site) {
    const error = new Error(isSuperAdmin ? "Please select a site" : "You are not assigned to a site");
    error.statusCode = 400;
    return next(error);
  }

  Asset.create({ ...rest, site, createdBy: req.user._id })
    .then((asset) => res.status(201).json({ success: true, data: asset }))
    .catch(next);
}

export function updateAsset(req, res, next) {
  Asset.findOneAndUpdate({ _id: req.params.id, ...scopeFilter(req.user) }, req.body, {
    new: true,
    runValidators: true,
  })
    .then((asset) => {
      if (!asset) {
        const error = new Error("Asset not found");
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({ success: true, data: asset });
    })
    .catch(next);
}

export function deleteAsset(req, res, next) {
  Asset.findOneAndDelete({ _id: req.params.id, ...scopeFilter(req.user) })
    .then((asset) => {
      if (!asset) {
        const error = new Error("Asset not found");
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({ success: true, message: "Asset deleted" });
    })
    .catch(next);
}

const TEMPLATE_HEADERS = [
  "Asset Name", "Category", "Status", "Location", "Serial Number",
  "Assigned Property", "Manufacturer", "Model", "Purchase Date (YYYY-MM-DD)",
  "Purchase Cost", "Warranty Expiry (YYYY-MM-DD)", "Notes",
];

export async function downloadTemplate(req, res, next) {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Assets");

    sheet.addRow(TEMPLATE_HEADERS);
    sheet.addRow([
      "Air Conditioning Unit #3", "HVAC", "Active", "Block A, Floor 2, Room 201",
      "SN-12345", "Marina Heights Block A", "Daikin", "FTX50J", "2025-01-15", 450000, "2027-01-15", "Sample row — delete before importing",
    ]);
    sheet.getRow(1).font = { bold: true };
    sheet.columns.forEach((col) => { col.width = 22; });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="asset-import-template.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
}

export async function importAssets(req, res, next) {
  try {
    if (!req.file) {
      const error = new Error("No file uploaded");
      error.statusCode = 400;
      throw error;
    }

    const isSuperAdmin = SUPER_ADMIN_ROLES.includes(req.user.role);
    const site = isSuperAdmin ? req.body.siteId : req.user.site;
    if (!site) {
      const error = new Error(isSuperAdmin ? "Please select a site" : "You are not assigned to a site");
      error.statusCode = 400;
      throw error;
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.worksheets[0];

    const properties = await Property.find({ site });
    const propertyMap = new Map(properties.map((p) => [p.name.toLowerCase().trim(), p._id]));

    const toInsert = [];
    const errors = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // header row

      const [name, category, status, location, serialNumber, propertyName, manufacturer, model, purchaseDate, purchaseCost, warrantyExpiry, notes] =
        row.values.slice(1);

      if (!name || !location) {
        errors.push({ row: rowNumber, reason: "Missing required field: Asset Name or Location" });
        return;
      }

      const resolvedCategory = ASSET_CATEGORIES.includes(category) ? category : "Other";
      const resolvedStatus = ASSET_STATUSES.includes(status) ? status : "Active";
      const assignedProperty = propertyName ? propertyMap.get(String(propertyName).toLowerCase().trim()) || null : null;

      if (propertyName && !assignedProperty) {
        errors.push({ row: rowNumber, reason: `Property "${propertyName}" not found — imported as unassigned` });
      }

      toInsert.push({
        name: String(name),
        category: resolvedCategory,
        status: resolvedStatus,
        location: String(location),
        serialNumber: serialNumber ? String(serialNumber) : undefined,
        assignedProperty,
        manufacturer: manufacturer ? String(manufacturer) : undefined,
        model: model ? String(model) : undefined,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
        purchaseCost: purchaseCost ? Number(purchaseCost) : 0,
        warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : undefined,
        notes: notes ? String(notes) : undefined,
        site,
        createdBy: req.user._id,
      });
    });

    if (toInsert.length === 0) {
      const error = new Error("No valid rows found to import");
      error.statusCode = 400;
      throw error;
    }

    const inserted = await Asset.insertMany(toInsert);
    res.status(201).json({
      success: true,
      message: `Imported ${inserted.length} asset(s)`,
      data: { insertedCount: inserted.length, errors },
    });
  } catch (err) {
    next(err);
  }
}