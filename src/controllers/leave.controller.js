import LeaveRequest from "../models/LeaveRequest.js";
import Employee from "../models/Employee.js";

const SUPER_ADMIN_ROLES = ["SUPER_ADMIN_1", "SUPER_ADMIN_2"];

function scopeFilter(user) {
  return SUPER_ADMIN_ROLES.includes(user.role) ? {} : { site: user.site };
}

export function getMyLeaveRequests(req, res, next) {
  Employee.findOne({ user: req.user._id })
    .then((employee) => {
      if (!employee) return res.status(200).json({ success: true, data: [] });
      return LeaveRequest.find({ employee: employee._id }).sort({ createdAt: -1 }).then((requests) => {
        res.status(200).json({ success: true, data: requests });
      });
    })
    .catch(next);
}

export function requestLeave(req, res, next) {
  const { leaveType, startDate, endDate, reason } = req.body;

  Employee.findOne({ user: req.user._id })
    .then((employee) => {
      if (!employee) {
        const error = new Error("No employee profile found for your account");
        error.statusCode = 404;
        throw error;
      }
      return LeaveRequest.create({
        employee: employee._id,
        leaveType,
        startDate,
        endDate,
        reason,
        site: employee.site,
      });
    })
    .then((request) => res.status(201).json({ success: true, data: request }))
    .catch(next);
}

export function getPendingLeaveRequests(req, res, next) {
  Employee.find(scopeFilter(req.user))
    .then((employees) => {
      const employeeIds = employees.map((e) => e._id);
      return LeaveRequest.find({ employee: { $in: employeeIds } })
        .populate("employee", "fullName office")
        .sort({ createdAt: -1 })
        .then((requests) => res.status(200).json({ success: true, data: requests }));
    })
    .catch(next);
}

export function reviewLeaveRequest(req, res, next) {
  const { status, reviewNote } = req.body; // "approved" | "rejected"

  LeaveRequest.findById(req.params.id)
    .then((request) => {
      if (!request) {
        const error = new Error("Leave request not found");
        error.statusCode = 404;
        throw error;
      }
      request.status = status;
      request.reviewedBy = req.user._id;
      request.reviewedAt = new Date();
      request.reviewNote = reviewNote;
      return request.save();
    })
    .then((request) => res.status(200).json({ success: true, data: request }))
    .catch(next);
}