import Tenant from "../models/Tenant.js";
import Expense from "../models/Expense.js";
import Property from "../models/Property.js";
const SUPER_ADMIN_ROLES = ["SUPER_ADMIN_1", "SUPER_ADMIN_2"];

function scopeFilter(user) {
  return SUPER_ADMIN_ROLES.includes(user.role) ? {} : { site: user.site };
}

export function getTenants(req, res, next) {
  const filter = scopeFilter(req.user);

  Tenant.find(filter)
    .populate("property", "name")
    .sort({ createdAt: -1 })
    .then((tenants) => {
      return Expense.aggregate([
        { $match: { tenant: { $in: tenants.map((t) => t._id) } } },
        { $group: { _id: "$tenant", total: { $sum: "$amount" } } },
      ]).then((totals) => {
        const totalsMap = new Map(totals.map((t) => [t._id.toString(), t.total]));
        const withBalance = tenants.map((tenant) => {
          const totalExpenses = totalsMap.get(tenant._id.toString()) || 0;
          return { ...tenant.toObject(), balance: tenant.securityDeposit - totalExpenses };
        });
        res.status(200).json({ success: true, data: withBalance });
      });
    })
    .catch(next);
}
export function createTenant(req, res, next) {
  const { property, siteId, ...rest } = req.body;
  const isSuperAdmin = SUPER_ADMIN_ROLES.includes(req.user.role);

  const resolveSite = property
    ? Property.findById(property).then((p) => p?.site)
    : Promise.resolve(isSuperAdmin ? siteId : req.user.site);

  resolveSite
    .then((site) => {
      if (!site) {
        const error = new Error(
          isSuperAdmin
            ? "Select a property so we know which site this tenant belongs to"
            : "You are not assigned to a site"
        );
        error.statusCode = 400;
        throw error;
      }
      return Tenant.create({ ...rest, property: property || null, site, createdBy: req.user._id });
    })
    .then((tenant) => res.status(201).json({ success: true, data: tenant }))
    .catch(next);
}

export function getTenantById(req, res, next) {
  Tenant.findOne({ _id: req.params.id, ...scopeFilter(req.user) })
    .populate("property", "name")
    .then((tenant) => {
      if (!tenant) {
        const error = new Error("Tenant not found");
        error.statusCode = 404;
        throw error;
      }

      return Expense.find({ tenant: tenant._id })
        .sort({ date: -1 })
        .then((expenses) => {
          const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
          const balance = tenant.securityDeposit - totalExpenses;

          res.status(200).json({
            success: true,
            data: { tenant, expenses, totalExpenses, balance },
          });
        });
    })
    .catch(next);
}

export function updateTenant(req, res, next) {
  Tenant.findOneAndUpdate({ _id: req.params.id, ...scopeFilter(req.user) }, req.body, {
    new: true,
    runValidators: true,
  })
    .then((tenant) => {
      if (!tenant) {
        const error = new Error("Tenant not found");
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({ success: true, data: tenant });
    })
    .catch(next);
}

export function uploadTenantSla(req, res, next) {
  if (!req.file) {
    const error = new Error("No file uploaded");
    error.statusCode = 400;
    return next(error);
  }

  Tenant.findOneAndUpdate(
    { _id: req.params.id, ...scopeFilter(req.user) },
    { slaFileUrl: `/uploads/sla/${req.file.filename}`, slaFileName: req.file.originalname },
    { new: true }
  )
    .then((tenant) => {
      if (!tenant) {
        const error = new Error("Tenant not found");
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({ success: true, data: tenant });
    })
    .catch(next);
}

export function addExpense(req, res, next) {
  const { description, category, amount, status, note } = req.body;

  Tenant.findOne({ _id: req.params.id, ...scopeFilter(req.user) })
    .then((tenant) => {
      if (!tenant) {
        const error = new Error("Tenant not found");
        error.statusCode = 404;
        throw error;
      }

      return Expense.create({
        tenant: tenant._id,
        description,
        category,
        amount,
        status,
        note,
        createdBy: req.user._id,
      });
    })
    .then((expense) => {
      res.status(201).json({ success: true, data: expense });
    })
    .catch(next);
}

export function updateReminders(req, res, next) {
  const { serviceChargeDueDate, reminderMonthsBefore } = req.body;

  Tenant.findOneAndUpdate(
    { _id: req.params.id, ...scopeFilter(req.user) },
    { serviceChargeDueDate, reminderMonthsBefore },
    { new: true }
  )
    .then((tenant) => {
      if (!tenant) {
        const error = new Error("Tenant not found");
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({ success: true, data: tenant });
    })
    .catch(next);
}