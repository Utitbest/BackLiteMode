import User from "../models/User.js";
import Site from "../models/Site.js";

export function getPendingUsers(req, res, next) {
  User.find({ siteStatus: "pending" })
    .select("-password")
    .sort({ createdAt: -1 })
    .then((users) => {
      res.status(200).json({ success: true, data: users });
    })
    .catch(next);
}

export function assignUserToSite(req, res, next) {
  const { id } = req.params;
  const { siteId, role } = req.body;

  if (!siteId) {
    const error = new Error("A site must be selected");
    error.statusCode = 400;
    return next(error);
  }

  Site.findById(siteId)
    .then((site) => {
      if (!site) {
        const error = new Error("Selected site does not exist");
        error.statusCode = 404;
        throw error;
      }

      return User.findById(id);
    })
    .then((user) => {
      if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
      }

      user.site = siteId;
      user.siteStatus = "assigned";
      if (role) user.role = role;

      return user.save();
    })
    .then((updatedUser) => {
      res.status(200).json({
        success: true,
        message: "User assigned successfully",
        data: { id: updatedUser._id, site: updatedUser.site, role: updatedUser.role },
      });
    })
    .catch(next);
}

export function rejectPendingUser(req, res, next) {
  User.findById(req.params.id)
    .then((user) => {
      if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
      }
      user.siteStatus = "rejected";
      return user.save();
    })
    .then(() => {
      res.status(200).json({ success: true, message: "Request rejected" });
    })
    .catch(next);
}