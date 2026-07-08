import AppraisalTemplate from "../models/AppraisalTemplate.js";
import Appraisal from "../models/Appraisal.js";
import Employee from "../models/Employee.js";

const SUPER_ADMIN_ROLES = ["SUPER_ADMIN_1", "SUPER_ADMIN_2"];

function scopeFilter(user) {
  return SUPER_ADMIN_ROLES.includes(user.role) ? {} : { site: user.site };
}

function weightedAverage(criteriaScores) {
  const totalWeight = criteriaScores.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return 0;
  const weightedSum = criteriaScores.reduce((sum, c) => sum + c.score * c.weight, 0);
  return Math.round((weightedSum / totalWeight) * 10) / 10; // one decimal place
}

// Templates
export function getTemplates(req, res, next) {
  AppraisalTemplate.find(scopeFilter(req.user))
    .sort({ createdAt: -1 })
    .then((templates) => res.status(200).json({ success: true, data: templates }))
    .catch(next);
}

export function createTemplate(req, res, next) {
  const { title, criteria, siteId } = req.body;
  const isSuperAdmin = SUPER_ADMIN_ROLES.includes(req.user.role);
  const site = isSuperAdmin ? siteId : req.user.site;

  if (!site) {
    const error = new Error(isSuperAdmin ? "Please select a site" : "You are not assigned to a site");
    error.statusCode = 400;
    return next(error);
  }

  AppraisalTemplate.create({ title, criteria, site, createdBy: req.user._id })
    .then((template) => res.status(201).json({ success: true, data: template }))
    .catch(next);
}

export function deleteTemplate(req, res, next) {
  AppraisalTemplate.findOneAndDelete({ _id: req.params.id, ...scopeFilter(req.user) })
    .then((template) => {
      if (!template) {
        const error = new Error("Template not found");
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({ success: true, message: "Template deleted" });
    })
    .catch(next);
}

// Reviews (appraisals)
export function getAppraisals(req, res, next) {
  Employee.find(scopeFilter(req.user))
    .then((employees) => {
      const employeeIds = employees.map((e) => e._id);
      return Appraisal.find({ employee: { $in: employeeIds } })
        .populate("employee", "fullName office")
        .populate("template", "title")
        .populate("reviewer", "fullName")
        .sort({ createdAt: -1 })
        .then((appraisals) => res.status(200).json({ success: true, data: appraisals }));
    })
    .catch(next);
}

export function createAppraisal(req, res, next) {
  const { employeeId, templateId, period, criteriaScores, comment, siteId } = req.body;
  const isSuperAdmin = SUPER_ADMIN_ROLES.includes(req.user.role);
  const site = isSuperAdmin ? siteId : req.user.site;

  if (!site) {
    const error = new Error(isSuperAdmin ? "Please select a site" : "You are not assigned to a site");
    error.statusCode = 400;
    return next(error);
  }

  const overallRating = weightedAverage(criteriaScores || []);

  Appraisal.create({
    employee: employeeId,
    template: templateId,
    period,
    reviewer: req.user._id,
    criteriaScores,
    overallRating,
    comment,
    site,
  })
    .then((appraisal) => res.status(201).json({ success: true, data: appraisal }))
    .catch(next);
}

export function acknowledgeAppraisal(req, res, next) {
  Appraisal.findById(req.params.id)
    .then((appraisal) => {
      if (!appraisal) {
        const error = new Error("Appraisal not found");
        error.statusCode = 404;
        throw error;
      }
      appraisal.status = "acknowledged";
      appraisal.acknowledgedAt = new Date();
      return appraisal.save();
    })
    .then((appraisal) => res.status(200).json({ success: true, data: appraisal }))
    .catch(next);
}

export function getMyAppraisals(req, res, next) {
  Employee.findOne({ user: req.user._id })
    .then((employee) => {
      if (!employee) return res.status(200).json({ success: true, data: [] });
      return Appraisal.find({ employee: employee._id })
        .populate("template", "title")
        .populate("reviewer", "fullName")
        .sort({ createdAt: -1 })
        .then((appraisals) => res.status(200).json({ success: true, data: appraisals }));
    })
    .catch(next);
}