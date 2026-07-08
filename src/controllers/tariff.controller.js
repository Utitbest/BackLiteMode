import Tariff from "../models/Tariff.js";

const SUPER_ADMIN_ROLES = ["SUPER_ADMIN_1", "SUPER_ADMIN_2"];

export function getTariff(req, res, next) {
  const site = SUPER_ADMIN_ROLES.includes(req.user.role) ? req.query.siteId : req.user.site;

  if (!site) {
    const error = new Error("Site is required");
    error.statusCode = 400;
    return next(error);
  }

  Tariff.findOne({ site })
    .then((tariff) => {
      res.status(200).json({
        success: true,
        data: tariff || { site, energyRate: 0, waterRate: 0 },
      });
    })
    .catch(next);
}

export function saveTariff(req, res, next) {
  const { energyRate, waterRate, siteId } = req.body;
  const isSuperAdmin = SUPER_ADMIN_ROLES.includes(req.user.role);
  const site = isSuperAdmin ? siteId : req.user.site;

  if (!site) {
    const error = new Error(isSuperAdmin ? "Please select a site" : "You are not assigned to a site");
    error.statusCode = 400;
    return next(error);
  }

  Tariff.findOneAndUpdate(
    { site },
    { energyRate, waterRate, updatedBy: req.user._id },
    { new: true, upsert: true }
  )
    .then((tariff) => res.status(200).json({ success: true, data: tariff }))
    .catch(next);
}