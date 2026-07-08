import Inventory from "../models/Inventory.js";

const SUPER_ADMIN_ROLES = ["SUPER_ADMIN_1", "SUPER_ADMIN_2"];

function scopeFilter(user) {
  return SUPER_ADMIN_ROLES.includes(user.role) ? {} : { site: user.site };
}

export function getInventory(req, res, next) {
  Inventory.find(scopeFilter(req.user))
    .sort({ itemName: 1 })
    .then((items) => res.status(200).json({ success: true, data: items }))
    .catch(next);
}

export function createInventoryItem(req, res, next) {
  const { itemName, category, quantity, unit, reorderThreshold, siteId } = req.body;
  const isSuperAdmin = SUPER_ADMIN_ROLES.includes(req.user.role);
  const site = isSuperAdmin ? siteId : req.user.site;

  if (!site) {
    const error = new Error(isSuperAdmin ? "Please select a site" : "You are not assigned to a site");
    error.statusCode = 400;
    return next(error);
  }

  Inventory.create({
    itemName,
    category,
    quantity: quantity || 0,
    unit,
    reorderThreshold: reorderThreshold || 0,
    site,
    createdBy: req.user._id,
  })
    .then((item) => res.status(201).json({ success: true, data: item }))
    .catch(next);
}

export function adjustStock(req, res, next) {
  const { quantity } = req.body; // positive to add stock, negative to remove

  Inventory.findOne({ _id: req.params.id, ...scopeFilter(req.user) })
    .then((item) => {
      if (!item) {
        const error = new Error("Inventory item not found");
        error.statusCode = 404;
        throw error;
      }

      const newQuantity = item.quantity + Number(quantity);
      if (newQuantity < 0) {
        const error = new Error("Not enough stock available");
        error.statusCode = 400;
        throw error;
      }

      item.quantity = newQuantity;
      return item.save();
    })
    .then((item) => res.status(200).json({ success: true, data: item }))
    .catch(next);
}