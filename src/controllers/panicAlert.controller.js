import PanicAlert from "../models/PanicAlert.js";

const SUPER_ADMIN_ROLES = ["SUPER_ADMIN_1", "SUPER_ADMIN_2"];
const RESPONDER_ROLES = ["SUPER_ADMIN_1", "SUPER_ADMIN_2", "OPERATIONS_MANAGER", "FACILITY_MANAGER", "SECURITY"];
const TRIGGER_ROLES = ["RESIDENT", "SECURITY"];

function scopeFilter(user) {
  return SUPER_ADMIN_ROLES.includes(user.role) ? {} : { site: user.site };
}

export function triggerPanicAlert(req, res, next) {
  if (!TRIGGER_ROLES.includes(req.user.role)) {
    const error = new Error("Only Residents and Security can trigger a Panic Alert");
    error.statusCode = 403;
    return next(error);
  }
  if (!req.user.site) {
    const error = new Error("You are not assigned to a site");
    error.statusCode = 400;
    return next(error);
  }

  PanicAlert.create({
    triggeredBy: req.user._id,
    location: req.body.location,
    site: req.user.site,
  })
    .then((alert) => res.status(201).json({ success: true, data: alert }))
    .catch(next);
}

export function getActiveAlerts(req, res, next) {
  if (!RESPONDER_ROLES.includes(req.user.role)) {
    const error = new Error("Not authorized to view Panic Alerts");
    error.statusCode = 403;
    return next(error);
  }

  PanicAlert.find({ status: "active", ...scopeFilter(req.user) })
    .populate("triggeredBy", "fullName role")
    .sort({ createdAt: -1 })
    .then((alerts) => res.status(200).json({ success: true, data: alerts }))
    .catch(next);
}

export function resolveAlert(req, res, next) {
  if (!RESPONDER_ROLES.includes(req.user.role)) {
    const error = new Error("Not authorized to resolve Panic Alerts");
    error.statusCode = 403;
    return next(error);
  }

  PanicAlert.findOne({ _id: req.params.id, ...scopeFilter(req.user) })
    .then((alert) => {
      if (!alert) {
        const error = new Error("Alert not found");
        error.statusCode = 404;
        throw error;
      }
      alert.status = "resolved";
      alert.resolvedBy = req.user._id;
      alert.resolvedAt = new Date();
      return alert.save();
    })
    .then((alert) => res.status(200).json({ success: true, data: alert }))
    .catch(next);
}

export function getMyActiveAlert(req, res, next) {
  PanicAlert.findOne({ triggeredBy: req.user._id, status: "active" })
    .then((alert) => res.status(200).json({ success: true, data: alert }))
    .catch(next);
}