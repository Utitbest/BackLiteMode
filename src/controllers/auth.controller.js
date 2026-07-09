import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import { sendEmail } from "../utils/sendEmail.js";
import { buildVerificationEmail } from "../emailsTemplate/verificationEmail.js";
import { buildResetPasswordEmail } from "../emailsTemplate/resetPasswordEmail.js";

function generateToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}


function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function sendError(next, message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  next(error);
}


export function super_Admin(req, res, next) {
  const {
    companyName,
    fullName,
    email,
    phone,
    address,
    password,
  } = req.body;

  User.findOne({ role: "SUPER_ADMIN_1" })
    .then((existingAdmin) => {
      if (existingAdmin) {
        return sendError(
          next,
          "A Super Admin 1 already exists",
          409
        );
      }

      return User.findOne({ email });
    })
    .then((existingUser) => {
      if (existingUser) {
        return sendError(
          next,
          "Email is already registered",
          409
        );
      }

      return bcrypt.hash(password, 10);
    })
    .then((hashedPassword) => {
      const code = generateVerificationCode();

      return User.create({
        companyName,
        fullName,
        email,
        phone,
        address,
        password: hashedPassword,
        role: "SUPER_ADMIN_1",
        siteStatus: "not_applicable",
        emailVerificationCode: code,
        emailVerificationExpires: Date.now() + 15 * 60 * 1000,
      }).then((user) => ({ user, code }));
    })
    .then(({ user, code }) => {
      sendEmail({
        to: user.email,
        subject: "Verify your email — Kaplan Servo",
        html: buildVerificationEmail({
          email: user.email,
          code,
        }),
      }).catch((err) =>
        console.error(
          "Failed to send verification email:",
          err.message
        )
      );

      res.status(201).json({
        success: true,
        message:
          "Super Admin account created — verification code sent",
        data: {
          id: user._id,
          email: user.email,
          role: user.role,
        },
      });
    })
    .catch(next);
}


export function register(req, res, next) {
  const { companyName, fullName, email, phone, address, password, requestedSiteName } = req.body;

  User.findOne({ email })
    .then((existing) => {
      if (existing) return sendError(next, "Email is already registered", 409);

      bcrypt.hash(password, 10).then((hashedPassword) => {
        const code = generateVerificationCode();

        User.create({
          companyName,
          fullName,
          email,
          phone,
          address,
          password: hashedPassword,
          requestedSiteName,
          siteStatus: "pending",
          emailVerificationCode: code,
          emailVerificationExpires: Date.now() + 15 * 60 * 1000,
        })
          .then((user) => {
            sendEmail({
              to: user.email,
              subject: "Verify your email — Kaplan Servo",
              html: buildVerificationEmail({ email: user.email, code }),
            }).catch((err) => console.error("Failed to send verification email:", err.message));
            console.log(`Verification code for ${user.email}: ${code}`);
            res.status(201).json({
              success: true,
              message: "Account created — verification code sent",
              data: { id: user._id, email: user.email },
            });
          })
          .catch(next);
      });
    })
    .catch(next);
}

export function verifyEmail(req, res, next) {
  const { email, code } = req.body;

  User.findOne({ email })
    .select("+emailVerificationCode +emailVerificationExpires")
    .then((user) => {
      if (!user) return sendError(next, "No account found for this email", 404);
      if (user.isEmailVerified) return sendError(next, "Email is already verified", 400);
      if (!user.emailVerificationCode || user.emailVerificationCode !== code) {
        return sendError(next, "Invalid verification code", 400);
      }
      if (user.emailVerificationExpires < Date.now()) {
        return sendError(next, "Verification code has expired", 400);
      }

      user.isEmailVerified = true;
      user.emailVerificationCode = undefined;
      user.emailVerificationExpires = undefined;
      user.save().then(() => {
        res.status(200).json({ success: true, message: "Email verified successfully" });
      });
    })
    .catch(next);
}

export function resendCode(req, res, next) {
  const { email } = req.body;

  User.findOne({ email })
    .then((user) => {
      if (!user) return sendError(next, "No account found for this email", 404);
      if (user.isEmailVerified) return sendError(next, "Email is already verified", 400);

      user.emailVerificationCode = generateVerificationCode();
      user.emailVerificationExpires = Date.now() + 15 * 60 * 1000;
      user.save().then((saved) => {
        sendEmail({
          to: saved.email,
          subject: "Your new verification code — Kaplan Servo",
          html: buildVerificationEmail({ email: saved.email, code: saved.emailVerificationCode }),
        }).catch((err) => console.error("Failed to resend verification email:", err.message));
        console.log(`Resent verification code for ${saved.email}: ${saved.emailVerificationCode}`);
        res.status(200).json({ success: true, message: "Verification code resent" });
      });
    })
    .catch(next);
}

export function login(req, res, next) {
  const { email, password } = req.body;

  User.findOne({ email })
    .select("+password")
    .then((user) => {
      if (!user) return sendError(next, "Invalid email or password", 401);

      bcrypt.compare(password, user.password).then((isMatch) => {
        if (!isMatch) return sendError(next, "Invalid email or password", 401);

        if (!user.isEmailVerified) {
          return res.status(403).json({
            success: false,
            message: "Please verify your email before logging in",
            data: { email: user.email, needsVerification: true },
          });
        }
        
        const token = generateToken(user._id);

        res
          .cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 7 * 24 * 60 * 60 * 1000,
          })
          .status(200)
          .json({
            success: true,
            message: "Login successful",
            data: {
              id: user._id,
              email: user.email,
              fullName: user.fullName,
              role: user.role,
              siteStatus: user.siteStatus,
            },
          });
      });
    })
    .catch(next);
}

export function forgotPassword(req, res, next) {
  const { email } = req.body;

  User.findOne({ email })
    .then((user) => {
      // Always respond success even if not found — don't reveal which emails are registered
      if (!user) {
        return res.status(200).json({
          success: true,
          message: "If that email exists, a reset link has been sent",
        });
      }

      const rawToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 mins

      user.save().then(() => {
        const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;

        sendEmail({
          to: email,
          subject: "Reset your password — Kaplan Servo",
          html: buildResetPasswordEmail({ email, resetUrl }),
        }).catch((err) => console.error("Failed to send reset password email:", err.message));
        console.log(`Password reset token for ${email}: ${rawToken}`);
        res.status(200).json({
          success: true,
          message: "If that email exists, a reset link has been sent",
        });
      });
    })
    .catch(next);
}

export function resetPassword(req, res, next) {
  const { email, token, password } = req.body;
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  User.findOne({
    email,
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  })
    .select("+resetPasswordToken +resetPasswordExpires")
    .then((user) => {
      if (!user) return sendError(next, "Reset link is invalid or has expired", 400);

      bcrypt.hash(password, 10).then((hashedPassword) => {
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        user.passwordChangedAt = new Date();
        user.save().then(() => {
          res.status(200).json({ success: true, message: "Password reset successful" });
        });
      });
    })
    .catch(next);
}
export function getMe(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }

    res.status(200).json({
      success: true,
      data: {
        id: req.user._id,
        fullName: req.user.fullName,
        email: req.user.email,
        role: req.user.role,
        site: req.user.site,
        siteStatus: req.user.siteStatus,
        requestedSiteName: req.user.requestedSiteName,
      },
    });
  } catch (err) {
    next(err);
  }
}

export function logout(req, res, next) {
  try {
    res
      .clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      })
      .status(200)
      .json({ success: true, message: "Logged out" });
  } catch (err) {
    next(err);
  }
}
export function updateMe(req, res, next) {
  const { fullName, phone, address } = req.body;

  User.findByIdAndUpdate(
    req.user._id,
    { fullName, phone, address },
    { new: true, runValidators: true }
  )
    .then((user) => {
      res.status(200).json({
        success: true,
        data: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          address: user.address,
          role: user.role,
        },
      });
    })
    .catch(next);
}

export function changePassword(req, res, next) {
  const { currentPassword, newPassword } = req.body;

  User.findById(req.user._id)
    .select("+password")
    .then((user) => {
      return bcrypt.compare(currentPassword, user.password).then((isMatch) => {
        if (!isMatch) {
          const error = new Error("Current password is incorrect");
          error.statusCode = 401;
          throw error;
        }
        return bcrypt.hash(newPassword, 10).then((hashedPassword) => {
          user.password = hashedPassword;
          user.passwordChangedAt = new Date(); // reuses the same session-invalidation logic from reset-password
          return user.save();
        });
      });
    })
    .then(() => {
      res.status(200).json({ success: true, message: "Password changed successfully" });
    })
    .catch(next);
}