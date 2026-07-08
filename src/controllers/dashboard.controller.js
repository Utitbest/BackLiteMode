import WorkOrder from "../models/WorkOrder.js";
import Tenant from "../models/Tenant.js";
import Property from "../models/Property.js";
import Employee from "../models/Employee.js";
import LeaveRequest from "../models/LeaveRequest.js";
import WfhTask from "../models/WfhTask.js";
import Attendance from "../models/Attendance.js";
import MaterialRequest from "../models/MaterialRequest.js";
import User from "../models/User.js";
import PanicAlert from "../models/PanicAlert.js";
import { todayString } from "../utils/attendanceHelpers.js";

const SUPER_ADMIN_ROLES = ["SUPER_ADMIN_1", "SUPER_ADMIN_2"];
const MANAGER_ROLES = ["OPERATIONS_MANAGER", "FACILITY_MANAGER"];

function scopeFilter(user) {
  return SUPER_ADMIN_ROLES.includes(user.role) ? {} : { site: user.site };
}

export function getDashboardSummary(req, res, next) {
  const role = req.user.role;

  if (SUPER_ADMIN_ROLES.includes(role) || MANAGER_ROLES.includes(role)) {
    return getManagerSummary(req, res, next);
  }
  if (role === "HR") {
    return getHrSummary(req, res, next);
  }
  if (role === "TECHNICIAN" || role === "SECURITY") {
    return getFieldStaffSummary(req, res, next);
  }
  return getResidentSummary(req, res, next);
}

function getManagerSummary(req, res, next) {
  const filter = scopeFilter(req.user);
  const isSuperAdmin = SUPER_ADMIN_ROLES.includes(req.user.role);

  Promise.all([
    WorkOrder.countDocuments({ ...filter, status: { $in: ["open", "assigned", "in_progress"] } }),
    WorkOrder.countDocuments({ ...filter, dueDate: { $lt: new Date() }, status: { $nin: ["completed", "cancelled"] } }),
    Tenant.countDocuments(filter),
    Property.countDocuments(filter),
    MaterialRequest.countDocuments({ ...filter, status: "requested" }),
    isSuperAdmin ? User.countDocuments({ siteStatus: "pending" }) : Promise.resolve(0),
    LeaveRequest.countDocuments({ ...filter, status: "pending" }),
    PanicAlert.countDocuments({ ...filter, status: "active" }),
  ])
    .then(([openWorkOrders, overdueWorkOrders, totalTenants, totalProperties, pendingProcurement, pendingSiteAssignments, pendingLeave, activePanicAlerts]) => {
      res.status(200).json({
        success: true,
        data: {
          role: "manager",
          openWorkOrders,
          overdueWorkOrders,
          totalTenants,
          totalProperties,
          pendingProcurement,
          pendingSiteAssignments,
          pendingLeave,
          activePanicAlerts,
        },
      });
    })
    .catch(next);
}

function getHrSummary(req, res, next) {
  const filter = scopeFilter(req.user);

  Employee.find(filter)
    .then((employees) => {
      const employeeIds = employees.map((e) => e._id);
      return Promise.all([
        employees.length,
        employees.filter((e) => e.status === "active").length,
        employees.filter((e) => e.status === "onboarding").length,
        LeaveRequest.countDocuments({ employee: { $in: employeeIds }, status: "pending" }),
        WfhTask.countDocuments({ employee: { $in: employeeIds }, status: "pending" }),
        Attendance.countDocuments({ employee: { $in: employeeIds }, date: todayString(), checkIn: { $ne: null } }),
      ]);
    })
    .then(([total, active, onboarding, pendingLeave, pendingWfh, presentToday]) => {
      res.status(200).json({
        success: true,
        data: { role: "hr", total, active, onboarding, pendingLeave, pendingWfh, presentToday },
      });
    })
    .catch(next);
}

function getFieldStaffSummary(req, res, next) {
  const baseFilter = { site: req.user.site, assignedTo: req.user._id };

  Promise.all([
    WorkOrder.countDocuments({ ...baseFilter, status: { $in: ["assigned", "in_progress"] } }),
    WorkOrder.countDocuments({ ...baseFilter, status: "completed" }),
    req.user.role === "SECURITY"
      ? PanicAlert.countDocuments({ site: req.user.site, status: "active" })
      : Promise.resolve(0),
  ])
    .then(([activeWorkOrders, completedWorkOrders, activePanicAlerts]) => {
      res.status(200).json({
        success: true,
        data: { role: "field", activeWorkOrders, completedWorkOrders, activePanicAlerts },
      });
    })
    .catch(next);
}

function getResidentSummary(req, res, next) {
  WorkOrder.find({ site: req.user.site, createdBy: req.user._id })
    .then((myWorkOrders) => {
      res.status(200).json({
        success: true,
        data: {
          role: "resident",
          totalWorkOrders: myWorkOrders.length,
          openWorkOrders: myWorkOrders.filter((w) => !["completed", "cancelled"].includes(w.status)).length,
        },
      });
    })
    .catch(next);
}