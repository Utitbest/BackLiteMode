import bcrypt from "bcryptjs";
import Employee, { DEPARTMENTS } from "../models/Employee.js";
import OnboardingTask from "../models/OnboardingTask.js";
import User from "../models/User.js";
const SUPER_ADMIN_ROLES = ["SUPER_ADMIN_1", "SUPER_ADMIN_2"];

function scopeFilter(user) {
  return SUPER_ADMIN_ROLES.includes(user.role) ? {} : { site: user.site };
}

function generatePin() {
  return String(Math.floor(1000 + Math.random() * 9000)); // 4-digit PIN
}

export function getEmployees(req, res, next) {
  Employee.find(scopeFilter(req.user))
    .populate("user", "fullName email role")
    .sort({ createdAt: -1 })
    .then((employees) => res.status(200).json({ success: true, data: employees }))
    .catch(next);
}

export function getHrStats(req, res, next) {
  Employee.find(scopeFilter(req.user))
    .then((employees) => {
      res.status(200).json({
        success: true,
        data: {
          total: employees.length,
          active: employees.filter((e) => e.status === "active").length,
          onboarding: employees.filter((e) => e.status === "onboarding").length,
        },
      });
    })
    .catch(next);
}

// Links an existing platform User to an HR Employee profile — doesn't create a new login account
export function createEmployee(req, res, next) {
  const {
    mode, // "existing" | "new"
    existingUserId,
    fullName, email, phone, platformRole,
    office, jobTitle, employeePin, joinDate, workMode,
    onboardingTasks, siteId,
  } = req.body;

  const isSuperAdmin = SUPER_ADMIN_ROLES.includes(req.user.role);
  const site = isSuperAdmin ? siteId : req.user.site;

  if (!site) {
    const error = new Error(isSuperAdmin ? "Please select a site" : "You are not assigned to a site");
    error.statusCode = 400;
    return next(error);
  }
  if (!employeePin) {
    const error = new Error("Employee ID / PIN is required");
    error.statusCode = 400;
    return next(error);
  }

  function buildEmployee(userId, resolvedFullName, resolvedEmail, resolvedPhone) {
    return Employee.create({
      fullName: resolvedFullName,
      email: resolvedEmail,
      phone: resolvedPhone,
      office,
      employeePin,
      jobTitle,
      joinDate,
      workMode,
      user: userId,
      site,
      createdBy: req.user._id,
    });
  }

  const setupSteps =
    mode === "existing"
      ? User.findById(existingUserId).then((user) => {
          if (!user) {
            const error = new Error("Selected user not found");
            error.statusCode = 404;
            throw error;
          }
          return buildEmployee(user._id, user.fullName, user.email, phone || user.phone);
        })
      : bcrypt.hash(Math.random().toString(36).slice(2) + Date.now(), 10).then((tempPassword) => {
          const resolvedEmail = email || `pin${employeePin}@noemail.internal`;
          return User.create({
            fullName,
            email: resolvedEmail,
            phone,
            password: tempPassword,
            role: platformRole || "TECHNICIAN",
            site,
            siteStatus: "assigned",
            isEmailVerified: true,
          }).then((newUser) => buildEmployee(newUser._id, fullName, resolvedEmail, phone));
        });

  setupSteps
    .then((employee) => {
      const tasks = (onboardingTasks || []).filter((t) => t && t.trim());
      if (tasks.length === 0) {
        return Promise.resolve({ employee, tasks: [] });
      }
      return OnboardingTask.insertMany(tasks.map((title) => ({ employee: employee._id, title }))).then(
        (createdTasks) => ({ employee, tasks: createdTasks })
      );
    })
    .then(({ employee, tasks }) => {
      res.status(201).json({ success: true, data: { employee, onboardingTasks: tasks } });
    })
    .catch(next);
}
export function getEmployeeById(req, res, next) {
  Employee.findOne({ _id: req.params.id, ...scopeFilter(req.user) })
    .populate("user", "fullName email role")
    .then((employee) => {
      if (!employee) {
        const error = new Error("Employee not found");
        error.statusCode = 404;
        throw error;
      }
      return OnboardingTask.find({ employee: employee._id }).then((tasks) => {
        res.status(200).json({ success: true, data: { employee, onboardingTasks: tasks } });
      });
    })
    .catch(next);
}

export function completeOnboardingTask(req, res, next) {
  OnboardingTask.findById(req.params.taskId)
    .then((task) => {
      if (!task) {
        const error = new Error("Task not found");
        error.statusCode = 404;
        throw error;
      }
      task.completed = true;
      task.completedAt = new Date();
      return task.save();
    })
    .then((task) => {
      return OnboardingTask.find({ employee: task.employee }).then((allTasks) => {
        const allDone = allTasks.every((t) => t.completed);
        if (allDone) {
          return Employee.findByIdAndUpdate(task.employee, { status: "active" }).then(() => task);
        }
        return task;
      });
    })
    .then((task) => res.status(200).json({ success: true, data: task }))
    .catch(next);
}

export function updateEmployeeStatus(req, res, next) {
  const { status } = req.body;

  Employee.findOneAndUpdate({ _id: req.params.id, ...scopeFilter(req.user) }, { status }, { new: true })
    .then((employee) => {
      if (!employee) {
        const error = new Error("Employee not found");
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({ success: true, data: employee });
    })
    .catch(next);
}

// Users not yet linked to an Employee profile — for the "Add Employee" picker
export function getUnlinkedUsers(req, res, next) {
  Employee.find(scopeFilter(req.user))
    .then((employees) => {
      const linkedUserIds = employees.map((e) => e.user);
      const filter = SUPER_ADMIN_ROLES.includes(req.user.role)
        ? { _id: { $nin: linkedUserIds } }
        : { _id: { $nin: linkedUserIds }, site: req.user.site };
      return User.find(filter).select("fullName email role");
    })
    .then((users) => res.status(200).json({ success: true, data: users }))
    .catch(next);
}

export function getMyEmployeeProfile(req, res, next) {
  Employee.findOne({ user: req.user._id })
    .then((employee) => {
      if (!employee) return res.status(200).json({ success: true, data: null });
      return OnboardingTask.find({ employee: employee._id }).then((tasks) => {
        res.status(200).json({ success: true, data: { employee, onboardingTasks: tasks } });
      });
    })
    .catch(next);
}

export function updateMySelfOnboarding(req, res, next) {
  const { NIN, salary, bankName, accountName, accountNumber } = req.body;

  Employee.findOne({ user: req.user._id })
    .then((employee) => {
      if (!employee) {
        const error = new Error("No employee profile found for your account");
        error.statusCode = 404;
        throw error;
      }

      if (NIN !== undefined) employee.NIN = NIN;
      if (salary !== undefined) employee.salary = salary;
      if (bankName !== undefined) employee.bankName = bankName;
      if (accountName !== undefined) employee.accountName = accountName;
      if (accountNumber !== undefined) employee.accountNumber = accountNumber;

      if (req.file) {
        employee.employeeDocumentUrl = `/uploads/employee-docs/${req.file.filename}`;
        employee.employeeDocumentName = req.file.originalname;
      }

      const hasCoreDetails = employee.NIN && employee.bankName && employee.accountNumber;
      if (hasCoreDetails) employee.selfOnboardingCompleted = true;

      return employee.save();
    })
    .then((employee) => res.status(200).json({ success: true, data: employee }))
    .catch(next);
}