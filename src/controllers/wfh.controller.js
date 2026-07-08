import WfhTask from "../models/WfhTask.js";
import Employee from "../models/Employee.js";

const SUPER_ADMIN_ROLES = ["SUPER_ADMIN_1", "SUPER_ADMIN_2"];

function scopeFilter(user) {
  return SUPER_ADMIN_ROLES.includes(user.role) ? {} : { site: user.site };
}

export function getMyWfhTasks(req, res, next) {
  Employee.findOne({ user: req.user._id })
    .then((employee) => {
      if (!employee) return res.status(200).json({ success: true, data: [] });
      return WfhTask.find({ employee: employee._id }).sort({ createdAt: -1 }).then((tasks) => {
        res.status(200).json({ success: true, data: tasks });
      });
    })
    .catch(next);
}

export function proposeWfhTask(req, res, next) {
  const { title, description, dueDate } = req.body;

  Employee.findOne({ user: req.user._id })
    .then((employee) => {
      if (!employee) {
        const error = new Error("No employee profile found for your account");
        error.statusCode = 404;
        throw error;
      }
      return WfhTask.create({ employee: employee._id, title, description, dueDate, site: employee.site });
    })
    .then((task) => res.status(201).json({ success: true, data: task }))
    .catch(next);
}

export function getPendingWfhTasks(req, res, next) {
  Employee.find(scopeFilter(req.user))
    .then((employees) => {
      const employeeIds = employees.map((e) => e._id);
      return WfhTask.find({ employee: { $in: employeeIds } })
        .populate("employee", "fullName office")
        .sort({ createdAt: -1 })
        .then((tasks) => res.status(200).json({ success: true, data: tasks }));
    })
    .catch(next);
}

export function reviewWfhTask(req, res, next) {
  const { status } = req.body;

  WfhTask.findById(req.params.id)
    .then((task) => {
      if (!task) {
        const error = new Error("Task not found");
        error.statusCode = 404;
        throw error;
      }
      task.status = status;
      task.reviewedBy = req.user._id;
      task.reviewedAt = new Date();
      return task.save();
    })
    .then((task) => res.status(200).json({ success: true, data: task }))
    .catch(next);
}