export function buildVerificationEmail({ email, code }) {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Verify your email</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f5f7; font-family:Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e5e7eb;">
            <tr>
              <td align="center" style="padding:36px 24px 16px 24px;">
                <span style="font-size:22px; font-weight:700; color:#4F46E5; letter-spacing:0.5px;">Kaplan</span>
                <div style="margin-top:2px; font-size:11px; font-weight:500; color:#9ca3af; letter-spacing:1.5px; text-transform:uppercase;">Servo</div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 0 32px;">
                <h1 style="margin:0 0 8px 0; font-size:20px; font-weight:600; color:#111827; text-align:center;">Verify your email address</h1>
                <p style="margin:0 0 24px 0; font-size:14px; line-height:22px; color:#6b7280; text-align:center;">
                  Use the code below to verify <strong style="color:#111827;">${email}</strong> and finish setting up your Servo account.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 32px 24px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="background-color:#f4f5ff; border:1px solid #e0e0fb; border-radius:8px;">
                  <tr>
                    <td style="padding:16px 32px;">
                      <span style="font-size:32px; font-weight:700; letter-spacing:8px; color:#4F46E5; font-family:'Courier New', monospace;">${code}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 24px 32px;">
                <p style="margin:0; font-size:13px; line-height:20px; color:#9ca3af; text-align:center;">
                  This code expires in <strong>15 minutes</strong>. If you didn't request this, you can safely ignore this email.
                </p>
              </td>
            </tr>
            <tr><td style="padding:0 32px;"><div style="border-top:1px solid #e5e7eb;"></div></td></tr>
            <tr>
              <td style="padding:24px 32px 32px 32px;" align="center">
                <p style="margin:0; font-size:12px; line-height:18px; color:#9ca3af;">Sent by Kaplan Servo &middot; Property Management Platform</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}