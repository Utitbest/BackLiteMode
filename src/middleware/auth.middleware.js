import jwt from "jsonwebtoken";
import User, { ROLES } from "../models/User.js";

function protect(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "Not authorized, no token" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ success: false, message: "Session expired, please log in again" });
    }

    User.findById(decoded.id)
      .select("+passwordChangedAt")
      .then((user) => {
        if (!user) {
          return res.status(401).json({ success: false, message: "User no longer exists" });
        }

        if (user.passwordChangedAt) {
          const changedAtSeconds = Math.floor(user.passwordChangedAt.getTime() / 1000);
          if (decoded.iat < changedAtSeconds) {
            return res.status(401).json({
              success: false,
              message: "Password was changed recently. Please log in again.",
            });
          }
        }

        req.user = user;
        next();
    })
    .catch(next);
  });
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "You don't have permission to do this" });
    }
    next();
  };
}

export { protect, authorize };