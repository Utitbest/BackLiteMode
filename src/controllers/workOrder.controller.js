import WorkOrder from "../models/WorkOrder.js";
import User from "../models/User.js";

const SUPER_ADMIN_ROLES = ["SUPER_ADMIN_1", "SUPER_ADMIN_2"];
const MANAGER_ROLES = ["OPERATIONS_MANAGER", "FACILITY_MANAGER"];

const ASSIGNABLE_ROLES = ["OPERATIONS_MANAGER", "FACILITY_MANAGER", "HR", "SECURITY", "TECHNICIAN"];

const FIELD_STAFF_ROLES = ["SECURITY", "TECHNICIAN"]

function buildScopeFilter(user) {
  if (SUPER_ADMIN_ROLES.includes(user.role)) return {};
  if (MANAGER_ROLES.includes(user.role) || user.role === "HR") {
    return { site: user.site };
  }
  if (FIELD_STAFF_ROLES.includes(user.role)) {
    return { site: user.site, $or: [{ assignedTo: user._id }, { createdBy: user._id }] };
  }
  return { site: user.site, createdBy: user._id };
}

export function getWorkOrders(req, res, next) {
  WorkOrder.find(buildScopeFilter(req.user))
    .populate("assignedTo", "fullName")
    .populate("createdBy", "fullName")
    .populate("asset", "name")
    .populate("createdBy", "name")
    .sort({ createdAt: -1 })
    .then((workOrders) => {
      res.status(200).json({ success: true, data: workOrders });
    })
    .catch(next);
}

export function createWorkOrder(req, res, next) {
  const {
    title, description, category, priority, location, property, asset,
    dueDate, assignedTo, estCost, sendSmsAlert, siteId,
  } = req.body;

  const isSuperAdmin = SUPER_ADMIN_ROLES.includes(req.user.role);
  const canAssign = isSuperAdmin || MANAGER_ROLES.includes(req.user.role);
  const site = isSuperAdmin ? siteId : req.user.site;

  if (!site) {
    const error = new Error(isSuperAdmin ? "Please select a site" : "You are not assigned to a site");
    error.statusCode = 400;
    return next(error);
  }

  const finalAssignedTo = canAssign && assignedTo ? assignedTo : null;
  const initialStatus = finalAssignedTo ? "assigned" : "open";

  WorkOrder.create({
    title,
    description,
    category,
    priority,
    location,
    property: property || null,
    asset: asset || null,
    dueDate,
    assignedTo: finalAssignedTo,
    estCost: estCost || 0,
    sendSmsAlert: !!sendSmsAlert,
    site,
    createdBy: req.user._id,
    status: initialStatus,
    statusHistory: [{ status: initialStatus, changedBy: req.user._id }],
  })
    .then((workOrder) => {
      if (sendSmsAlert && finalAssignedTo) {
        // TODO: integrate an SMS provider (e.g. Termii) once ready
        console.log(`SMS alert would be sent for work order ${workOrder._id} to assignee ${finalAssignedTo}`);
      }
      res.status(201).json({ success: true, data: workOrder });
    })
    .catch(next);
}

export function getWorkOrderById(req, res, next) {
  WorkOrder.findOne({ _id: req.params.id, ...buildScopeFilter(req.user) })
    .populate("assignedTo", "fullName")
    .populate("createdBy", "fullName")
    .populate("asset", "name")
    .populate("createdBy", "name")
    .then((workOrder) => {
      if (!workOrder) {
        const error = new Error("Work order not found");
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({ success: true, data: workOrder });
    })
    .catch(next);
}

export function updateStatus(req, res, next) {
  const { status } = req.body;

  WorkOrder.findOne({ _id: req.params.id, ...buildScopeFilter(req.user) })
    .then((workOrder) => {
      if (!workOrder) {
        const error = new Error("Work order not found");
        error.statusCode = 404;
        throw error;
      }

      const isSuperAdmin = SUPER_ADMIN_ROLES.includes(req.user.role);
      const isManager = MANAGER_ROLES.includes(req.user.role);
      const isAssignee = workOrder.assignedTo?.toString() === req.user._id.toString();

      if (!isSuperAdmin && !isManager && !isAssignee) {
        const error = new Error("You don't have permission to update this work order's status");
        error.statusCode = 403;
        throw error;
      }

      workOrder.status = status;
      workOrder.statusHistory.push({ status, changedBy: req.user._id });
      return workOrder.save();
    })
    .then((workOrder) => res.status(200).json({ success: true, data: workOrder }))
    .catch(next);
}
export function updateActualCost(req, res, next) {
  const { actualCost } = req.body;

  WorkOrder.findOne({ _id: req.params.id, ...buildScopeFilter(req.user) })
    .then((workOrder) => {
      if (!workOrder) {
        const error = new Error("Work order not found");
        error.statusCode = 404;
        throw error;
      }

      const isSuperAdmin = SUPER_ADMIN_ROLES.includes(req.user.role);
      const isManager = MANAGER_ROLES.includes(req.user.role);
      if (!isSuperAdmin && !isManager) {
        const error = new Error("Only Managers or Super Admins can update actual cost");
        error.statusCode = 403;
        throw error;
      }

      workOrder.actualCost = actualCost;
      return workOrder.save();
    })
    .then((workOrder) => res.status(200).json({ success: true, data: workOrder }))
    .catch(next);
}
export function submitFeedback(req, res, next) {
  const { rating, comment } = req.body;

  WorkOrder.findOne({ _id: req.params.id, ...buildScopeFilter(req.user) })
    .then((workOrder) => {
      if (!workOrder) {
        const error = new Error("Work order not found");
        error.statusCode = 404;
        throw error;
      }

      workOrder.feedback = { rating, comment, submittedBy: req.user._id, submittedAt: new Date() };
      return workOrder.save();
    })
    .then((workOrder) => res.status(200).json({ success: true, data: workOrder }))
    .catch(next);
}

export function getAssignableUsers(req, res, next) {
  const isSuperAdmin = SUPER_ADMIN_ROLES.includes(req.user.role);

  if (isSuperAdmin && !req.query.siteId) {
    // Don't return a jumbled cross-site pool — force a site to be picked first
    return res.status(200).json({ success: true, data: [] });
  }

  const site = isSuperAdmin ? req.query.siteId : req.user.site;
  const filter = { role: { $in: ASSIGNABLE_ROLES }, site };

  User.find(filter)
    .select("fullName role")
    .then((users) => res.status(200).json({ success: true, data: users }))
    .catch(next);
}


// To fix the super addmin shit of selecting different site users for work order