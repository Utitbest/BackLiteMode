import resend from "../config/resend.js";

export function sendEmail({ to, subject, html }) {
  return resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });
}