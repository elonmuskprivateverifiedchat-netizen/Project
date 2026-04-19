import nodemailer from "nodemailer";

// Obfuscated SMTP config - uses environment variables
function createTransport() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";

  if (!user || !pass) {
    // Return a test/dev transporter using Ethereal
    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      auth: { user: "expressprofx.test@ethereal.email", pass: "xpressprofx2026" },
    });
  }

  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}

const FROM = process.env.EMAIL_FROM || "XpressProFX <noreply@xpressprofx.com>";

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const transporter = createTransport();
    await transporter.sendMail({ from: FROM, to, subject, html });
    return true;
  } catch (err) {
    console.error("[Email] Failed to send:", err);
    return false;
  }
}

export async function sendAdminOTP(email: string, code: string): Promise<boolean> {
  const html = `
    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#0f1117;color:#e5e7eb;border-radius:12px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
        <div style="width:40px;height:40px;background:#e11d48;border-radius:10px;display:flex;align-items:center;justify-content:center;">
          <span style="color:white;font-size:20px;">🛡</span>
        </div>
        <h2 style="margin:0;color:#f9fafb;font-size:18px;">XpressProFX Admin Verification</h2>
      </div>
      <p style="color:#9ca3af;margin-bottom:16px;">Your admin panel verification code is:</p>
      <div style="background:#1f2937;border:2px solid #374151;border-radius:10px;padding:20px;text-align:center;margin-bottom:20px;">
        <span style="font-size:40px;font-weight:bold;letter-spacing:12px;color:#e11d48;font-family:monospace;">${code}</span>
      </div>
      <p style="color:#9ca3af;font-size:13px;">This code expires in <strong style="color:#f9fafb;">30 minutes</strong>. Do not share it with anyone.</p>
      <p style="color:#6b7280;font-size:12px;margin-top:20px;border-top:1px solid #374151;padding-top:16px;">If you did not request this code, someone may be attempting to access the admin panel. Please contact security immediately.</p>
      <p style="color:#6b7280;font-size:11px;text-align:center;margin-top:12px;">XpressProFX — Professional Forex Trading Platform</p>
    </div>
  `;
  return sendEmail(email, "XpressProFX Admin Panel — Verification Code", html);
}

export async function sendWelcomeEmail(email: string, fullName: string): Promise<boolean> {
  const html = `
    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#0f1117;color:#e5e7eb;border-radius:12px;">
      <h2 style="color:#10b981;">Welcome to XpressProFX, ${fullName}!</h2>
      <p style="color:#9ca3af;">Your trading account has been created successfully. You can now access the platform and start trading.</p>
      <a href="${process.env.APP_URL || "https://xpressprofx.com"}/auth/login" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#10b981;color:white;border-radius:8px;text-decoration:none;font-weight:bold;">Access Platform</a>
      <p style="color:#6b7280;font-size:12px;margin-top:24px;">XpressProFX — Professional Forex Trading Platform</p>
    </div>
  `;
  return sendEmail(email, "Welcome to XpressProFX!", html);
}

export async function sendTransactionNotification(email: string, fullName: string, type: string, amount: string, currency: string): Promise<boolean> {
  const html = `
    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#0f1117;color:#e5e7eb;border-radius:12px;">
      <h2 style="color:#10b981;">Transaction Notification</h2>
      <p style="color:#9ca3af;">Hello ${fullName},</p>
      <p style="color:#e5e7eb;">A <strong>${type}</strong> of <strong>${amount} ${currency}</strong> has been processed on your account.</p>
      <p style="color:#6b7280;font-size:12px;margin-top:24px;">XpressProFX — Professional Forex Trading Platform</p>
    </div>
  `;
  return sendEmail(email, `XpressProFX — ${type} Notification`, html);
}
