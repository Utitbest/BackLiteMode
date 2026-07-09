import Property from "../models/Property.js";

const MANAGER_ROLES = ["SUPER_ADMIN_1", "SUPER_ADMIN_2", "OPERATIONS_MANAGER", "FACILITY_MANAGER"];
const SUPER_ADMIN_ROLES = ["SUPER_ADMIN_1", "SUPER_ADMIN_2"];

export function getProperties(req, res, next) {
  const isSuperAdmin = SUPER_ADMIN_ROLES.includes(req.user.role);
  const filter = isSuperAdmin
    ? (req.query.siteId ? { site: req.query.siteId } : {})
    : { site: req.user.site };

  Property.find(filter)
    .populate("site", "name")
    .sort({ createdAt: -1 })
    .then((properties) => {
      res.status(200).json({ success: true, data: properties });
    })
    .catch(next);
}

export function createProperty(req, res, next) {
  const { name, type, address, totalUnits, siteId } = req.body;
  const isSuperAdmin = SUPER_ADMIN_ROLES.includes(req.user.role);

  const site = isSuperAdmin ? siteId : req.user.site;

  if (!site) {
    const error = new Error(
      isSuperAdmin ? "Please select a site for this property" : "You are not assigned to a site"
    );
    error.statusCode = 400;
    return next(error);
  }

  Property.create({
    name,
    type,
    address,
    totalUnits,
    site,
    createdBy: req.user._id,
  })
    .then((property) => {
      res.status(201).json({ success: true, data: property });
    })
    .catch(next);
}