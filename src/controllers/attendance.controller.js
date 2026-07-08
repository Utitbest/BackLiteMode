import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";
import { todayString, isLate } from "../utils/attendanceHelpers.js";

const SUPER_ADMIN_ROLES = ["SUPER_ADMIN_1", "SUPER_ADMIN_2"];

function scopeFilter(user) {
  return SUPER_ADMIN_ROLES.includes(user.role) ? {} : { site: user.site };
}

export function getMyAttendanceToday(req, res, next) {
  Employee.findOne({ user: req.user._id })
    .then((employee) => {
      if (!employee) return res.status(200).json({ success: true, data: null });
      return Attendance.findOne({ employee: employee._id, date: todayString() }).then((attendance) => {
        res.status(200).json({ success: true, data: attendance });
      });
    })
    .catch(next);
}

export function getMyRecentAttendance(req, res, next) {
  Employee.findOne({ user: req.user._id })
    .then((employee) => {
      if (!employee) return res.status(200).json({ success: true, data: [] });
      return Attendance.find({ employee: employee._id }).sort({ date: -1 }).limit(7).then((records) => {
        res.status(200).json({ success: true, data: records });
      });
    })
    .catch(next);
}

export function checkIn(req, res, next) {
  toggleAttendance(req.user._id, res, next);
}

function toggleAttendance(userId, res, next) {
  Employee.findOne({ user: userId })
    .then((employee) => {
      if (!employee) {
        const error = new Error("No HR profile found for this account");
        error.statusCode = 404;
        throw error;
      }

      const date = todayString();
      return Attendance.findOne({ employee: employee._id, date }).then((existing) => {
        const now = new Date();

        if (!existing) {
          return Attendance.create({
            employee: employee._id,
            date,
            checkIn: now,
            status: isLate(now) ? "late" : "present",
            site: employee.site,
          });
        }

        if (!existing.checkOut) {
          existing.checkOut = now;
          return existing.save();
        }

        const error = new Error("Already checked in and out for today");
        error.statusCode = 400;
        throw error;
      });
    })
    .then((attendance) => res.status(200).json({ success: true, data: attendance }))
    .catch(next);
}

export function checkInByPin(req, res, next) {
  const { pin } = req.body;
  const site = SUPER_ADMIN_ROLES.includes(req.user.role) ? req.body.siteId : req.user.site;

  Employee.findOne({ employeePin: pin, ...(site ? { site } : {}) })
    .populate("user", "fullName")
    .then((employee) => {
      if (!employee) {
        const error = new Error("Invalid PIN");
        error.statusCode = 404;
        throw error;
      }

      const date = todayString();
      return Attendance.findOne({ employee: employee._id, date }).then((existing) => {
        const now = new Date();

        if (!existing) {
          return Attendance.create({
            employee: employee._id,
            date,
            checkIn: now,
            status: isLate(now) ? "late" : "present",
            site: employee.site,
          }).then((a) => ({ attendance: a, employee, action: "checked in" }));
        }

        if (!existing.checkOut) {
          existing.checkOut = now;
          return existing.save().then((a) => ({ attendance: a, employee, action: "checked out" }));
        }

        const error = new Error("Already checked in and out for today");
        error.statusCode = 400;
        throw error;
      });
    })
    .then(({ attendance, employee, action }) => {
      res.status(200).json({
        success: true,
        message: `${employee.user.fullName} ${action}`,
        data: attendance,
      });
    })
    .catch(next);
}

export function getAttendanceByDate(req, res, next) {
  const date = req.query.date || todayString();

  Employee.find(scopeFilter(req.user))
    .then((employees) => {
      const employeeIds = employees.map((e) => e._id);
      return Attendance.find({ employee: { $in: employeeIds }, date })
        .populate({ path: "employee", populate: { path: "user", select: "fullName" } })
        .then((records) => {
          res.status(200).json({
            success: true,
            data: {
              records,
              present: records.filter((r) => r.status === "present").length,
              late: records.filter((r) => r.status === "late").length,
              checkedOut: records.filter((r) => r.checkOut).length,
              activeStaff: employees.filter((e) => e.status === "active").length,
            },
          });
        });
    })
    .catch(next);
}