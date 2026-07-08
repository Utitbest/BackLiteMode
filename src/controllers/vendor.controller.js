import Vendor from "../models/Vendor.js";

const SUPER_ADMIN_ROLES = ["SUPER_ADMIN_1", "SUPER_ADMIN_2"];

export function getVendors(req, res, next) {
  const filter = SUPER_ADMIN_ROLES.includes(req.user.role) ? {} : { site: req.user.site };

  Vendor.find(filter)
    .sort({ name: 1 })
    .then((vendors) => res.status(200).json({ success: true, data: vendors }))
    .catch(next);
}

export function createVendor(req, res, next) {
  const { name, contactPerson, phone, email, address, category, siteId } = req.body;
  const isSuperAdmin = SUPER_ADMIN_ROLES.includes(req.user.role);
  const site = isSuperAdmin ? siteId : req.user.site;

  if (!site) {
    const error = new Error(isSuperAdmin ? "Please select a site" : "You are not assigned to a site");
    error.statusCode = 400;
    return next(error);
  }

  Vendor.create({ name, contactPerson, phone, email, address, category, site, createdBy: req.user._id })
    .then((vendor) => res.status(201).json({ success: true, data: vendor }))
    .catch(next);
}