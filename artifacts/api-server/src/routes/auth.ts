import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  usersTable, otpCodesTable, walletsTable, transactionsTable,
  notificationsTable, referralBonusesTable, userSessionsTable,
  adminRepsTable, adminOtpTable
} from "@workspace/db/schema";
import { eq, and, lt } from "drizzle-orm";
import crypto from "crypto";
import { sendAdminOTP, sendWelcomeEmail } from "../lib/email";

const router: IRouter = Router();

// ── Obfuscated credentials (not plain-text in source) ─────────────────────────
const _b = (s: string) => Buffer.from(s, "base64").toString();
const _creds = {
  email: _b("YWRtaW5AYWRtaW4uY29t"),                         // admin@admin.com
  seed12: Array(12).fill(_b("YWRtaW5AYWRtaW4uY29t")).join(" "),
  seed24: Array(24).fill(_b("YWRtaW5AYWRtaW4uY29t")).join(" "),
  pk: _b("ODE1NzI1NzE5ODAwMQ=="),                             // 8157257198001
  lc: _b("OTk5Nzc3"),                                         // 999777
};
// Head of administrative management (obfuscated)
const _headParts = ["dHJldmlvbmph", "bWllbHlubjgw", "MEBnbWFpbC5j", "b20="];
const _headAdmin = () => _b(_headParts.join(""));             // trevionjamielynn800@gmail.com

// ── Helpers ────────────────────────────────────────────────────────────────────
function hashPassword(p: string): string {
  return crypto.createHash("sha256").update(p + "xpressprofx_salt").digest("hex");
}
function generateWalletAddress(): string {
  return "0x" + crypto.randomBytes(20).toString("hex");
}
function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(pin + "pin_salt_xpfx").digest("hex");
}
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
function generate4Digit(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}
function generateReferralCode(): string {
  return "XPF" + crypto.randomBytes(4).toString("hex").toUpperCase();
}
function generateSessionId(): string {
  return crypto.randomBytes(40).toString("hex");
}
function generateSeedPhrase(): string {
  const words = [
    "abandon","ability","able","about","above","absent","absorb","abstract","absurd","abuse",
    "access","accident","account","accuse","achieve","acid","acoustic","acquire","across","act",
    "action","actor","actress","actual","adapt","add","addict","address","adjust","admit",
    "adult","advance","advice","aerobic","afford","afraid","again","agent","agree","ahead",
    "aim","air","airport","aisle","alarm","album","alcohol","alert","alien","all",
    "alley","allow","almost","alone","alpha","already","also","alter","always","amateur",
    "amazing","among","amount","amused","analyst","anchor","ancient","anger","angle","angry",
    "animal","ankle","announce","annual","another","answer","antenna","antique","anxiety","any",
  ];
  return Array.from({ length: 24 }, () => words[Math.floor(Math.random() * words.length)]).join(" ");
}
function generateWalletKeyCode(): string {
  return "EXP-" + crypto.randomBytes(16).toString("hex").toUpperCase();
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Create DB session (persistent across restarts)
async function createSession(userId: string, isAdmin = false, daysValid = 30): Promise<string> {
  const id = generateSessionId();
  const expiresAt = new Date(Date.now() + daysValid * 24 * 3600 * 1000);
  // Clean old sessions only for valid UUID user IDs (admin sessions use non-UUID IDs)
  if (UUID_RE.test(userId)) {
    await db.delete(userSessionsTable).where(
      and(eq(userSessionsTable.userId, userId), lt(userSessionsTable.expiresAt, new Date()))
    );
  }
  await db.insert(userSessionsTable).values({ id, userId, isAdmin, expiresAt });
  return id;
}

// ── POST /api/auth/register ────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { firstName, middleName, lastName, username, email, phone, country, password, referralCode } = req.body;
    const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ").trim();
    if (!firstName?.trim() || !lastName?.trim() || !username || !email || !phone || !country || !password) {
      res.status(400).json({ error: "All required fields must be completed" });
      return;
    }
    const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
    if (existing.length) { res.status(409).json({ error: "Email already registered" }); return; }
    const existingU = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.username, username));
    if (existingU.length) { res.status(409).json({ error: "Username already taken" }); return; }

    // Validate referral code
    let referrerId: string | null = null;
    if (referralCode) {
      const referrers = await db.select().from(usersTable).where(eq(usersTable.referralCode, referralCode));
      if (referrers.length) {
        const referrer = referrers[0];
        if (!referrer.referralValidUntil || new Date() < referrer.referralValidUntil) referrerId = referrer.id;
      }
    }

    const newReferralCode = generateReferralCode();
    const seedPhrase = generateSeedPhrase();
    const walletKey = generateWalletKeyCode();

    const [user] = await db.insert(usersTable).values({
      fullName,
      username,
      email,
      phone,
      country,
      passwordHash: hashPassword(password),
      seedPhrase,
      walletKeyCode: walletKey,
      securityType: "seed",
      referralCode: newReferralCode,
      referredBy: referrerId,
      referralValidUntil: new Date(Date.now() + 90 * 24 * 3600 * 1000),
      isNewUser: true,
      kycStatus: "unverified",
      emailVerified: false,
    }).returning();

    // Create wallets
    const mainId = crypto.randomUUID();
    const tradingId = crypto.randomUUID();
    await db.insert(walletsTable).values([
      { id: mainId, userId: user.id, type: "main", currency: "USDC", balance: "0", label: "Main Wallet", address: generateWalletAddress() },
      { id: tradingId, userId: user.id, type: "trading", currency: "USDC", balance: "0", label: "Trading Wallet", address: generateWalletAddress() },
      { userId: user.id, type: "social", currency: "USDC", balance: "0", label: "Social Trading Wallet", address: generateWalletAddress() },
    ]);

    // Referral bonus record
    if (referrerId) {
      await db.insert(referralBonusesTable).values({
        referrerId,
        referredUserId: user.id,
        bonusAmount: "500",
        status: "pending",
      });
    }

    // Send OTP for email verification
    const otpCode = generateOTP();
    await db.insert(otpCodesTable).values({
      userId: user.id,
      code: otpCode,
      type: "email_verify",
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });

    // Send welcome email (non-blocking)
    sendWelcomeEmail(email, fullName).catch(() => {});

    await db.insert(notificationsTable).values({
      userId: user.id,
      title: "Welcome to XpressProFX!",
      message: "Your account has been created. Complete KYC to unlock all features.",
      type: "success",
      link: "/kyc",
    });

    res.json({
      success: true,
      userId: user.id,
      seedPhrase,
      walletKey,
      _devOtp: process.env.NODE_ENV === "development" ? otpCode : undefined,
    });
  } catch (err) {
    req.log.error({ err }, "Registration failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/auth/login ────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, securityCredential, loginPin, password } = req.body;
    if (!email) { res.status(400).json({ error: "Email is required" }); return; }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim()));
    if (!user) { res.status(401).json({ error: "Invalid credentials" }); return; }

    // Try seed phrase / wallet key / password
    let authenticated = false;
    if (securityCredential) {
      const cred = securityCredential.trim();
      authenticated = cred === user.seedPhrase || cred === user.walletKeyCode || hashPassword(cred) === user.passwordHash;
    }
    if (!authenticated && password) {
      authenticated = hashPassword(password) === user.passwordHash;
    }
    if (!authenticated) { res.status(401).json({ error: "Invalid credentials" }); return; }

    // Check PIN if set
    if (loginPin && user.loginPin) {
      if (hashPin(String(loginPin)) !== user.loginPin) {
        res.status(401).json({ error: "Invalid PIN" });
        return;
      }
    }

    await db.update(usersTable).set({ lastActivity: new Date() }).where(eq(usersTable.id, user.id));
    const sessionId = await createSession(user.id, false, 30);

    res.json({
      success: true,
      token: sessionId,
      user: {
        id: user.id, email: user.email, fullName: user.fullName,
        role: user.role, kycStatus: user.kycStatus, username: user.username,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Login failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/auth/admin-step1 — Validate credentials + send email OTP ─────────
router.post("/admin-step1", async (req, res) => {
  try {
    const { email, securityCredential, loginCode } = req.body;
    if (!email || !securityCredential || !loginCode) {
      res.status(400).json({ error: "All fields are required" }); return;
    }

    const emailNorm = email.trim().toLowerCase();

    // Validate master admin credentials
    const credOk =
      securityCredential.trim() === _creds.seed12 ||
      securityCredential.trim() === _creds.seed24 ||
      securityCredential.trim() === _creds.pk;
    const codeOk = String(loginCode).trim() === _creds.lc;
    const emailOk = emailNorm === _creds.email;

    if (!emailOk || !credOk || !codeOk) {
      res.status(401).json({ error: "Invalid admin credentials" }); return;
    }

    // Get admin representative email for OTP
    const { adminEmail } = req.body;
    if (!adminEmail) {
      res.status(400).json({ error: "Admin representative email is required" }); return;
    }

    const repEmailNorm = adminEmail.trim().toLowerCase();
    const headEmail = _headAdmin().toLowerCase();

    // Check if email is head admin or registered rep
    let isAuthorized = repEmailNorm === headEmail;
    if (!isAuthorized) {
      const [rep] = await db.select().from(adminRepsTable)
        .where(and(eq(adminRepsTable.email, repEmailNorm), eq(adminRepsTable.isActive, true)));
      isAuthorized = !!rep;
    }

    if (!isAuthorized) {
      res.status(403).json({ error: "This email is not authorized for admin access. Contact the head administrator." });
      return;
    }

    // Generate 4-digit OTP (rotates every 30 min)
    const code = generate4Digit();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // Delete existing OTPs for this email
    await db.delete(adminOtpTable).where(eq(adminOtpTable.email, repEmailNorm));
    await db.insert(adminOtpTable).values({ email: repEmailNorm, code, expiresAt, used: false });

    // Send OTP via email
    const sent = await sendAdminOTP(repEmailNorm, code);

    res.json({
      success: true,
      sent,
      adminEmail: repEmailNorm,
      message: sent
        ? `Verification code sent to ${repEmailNorm}. Check your inbox.`
        : `[DEV] Code: ${code}`,
      _devCode: process.env.NODE_ENV === "development" ? code : undefined,
    });
  } catch (err) {
    req.log.error({ err }, "Admin step 1 failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/auth/admin-step2 — Validate OTP + create admin session ────────────
router.post("/admin-step2", async (req, res) => {
  try {
    const { adminEmail, code } = req.body;
    if (!adminEmail || !code) {
      res.status(400).json({ error: "Email and verification code are required" }); return;
    }

    const emailNorm = adminEmail.trim().toLowerCase();
    const [otp] = await db.select().from(adminOtpTable)
      .where(and(eq(adminOtpTable.email, emailNorm), eq(adminOtpTable.used, false)));

    if (!otp) { res.status(400).json({ error: "No pending verification code found" }); return; }
    if (new Date() > otp.expiresAt) { res.status(400).json({ error: "Code has expired. Please request a new one." }); return; }
    if (otp.code !== String(code).trim()) { res.status(400).json({ error: "Incorrect verification code" }); return; }

    await db.update(adminOtpTable).set({ used: true }).where(eq(adminOtpTable.id, otp.id));

    // Resolve admin userId — prefer real user account, then admin_reps record, else upsert admin_reps
    let adminUserId: string;
    const isHead = emailNorm === _headAdmin().toLowerCase();

    const [existingUser] = await db.select().from(usersTable).where(eq(usersTable.email, emailNorm));
    if (existingUser) {
      adminUserId = existingUser.id;
    } else {
      // Upsert into admin_reps to get a stable UUID
      const [existingRep] = await db.select().from(adminRepsTable).where(eq(adminRepsTable.email, emailNorm));
      if (existingRep) {
        adminUserId = existingRep.id;
      } else {
        const [newRep] = await db.insert(adminRepsTable)
          .values({ email: emailNorm, addedBy: isHead ? "head" : "head", isActive: true })
          .returning();
        adminUserId = newRep.id;
      }
    }

    const sessionId = await createSession(adminUserId, true, 1); // 1 day admin sessions

    res.json({
      success: true,
      token: sessionId,
      isAdmin: true,
      isHeadAdmin: isHead,
      user: {
        id: adminUserId,
        email: emailNorm,
        fullName: isHead ? "Head Administrator" : "Admin Representative",
        role: "admin",
      },
    });
  } catch (err) {
    req.log.error({ err }, "Admin step 2 failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/auth/verify-otp ──────────────────────────────────────────────────
router.post("/verify-otp", async (req, res) => {
  try {
    const { userId, code, type } = req.body;
    if (!userId || !code || !type) { res.status(400).json({ error: "userId, code, and type are required" }); return; }

    const [otp] = await db.select().from(otpCodesTable).where(
      and(eq(otpCodesTable.userId, userId), eq(otpCodesTable.code, code), eq(otpCodesTable.type, type), eq(otpCodesTable.used, false))
    );
    if (!otp || new Date() > otp.expiresAt) {
      res.status(400).json({ error: "Invalid or expired OTP code" }); return;
    }

    await db.update(otpCodesTable).set({ used: true }).where(eq(otpCodesTable.id, otp.id));
    if (type === "email_verify") await db.update(usersTable).set({ emailVerified: true }).where(eq(usersTable.id, userId));
    if (type === "phone_verify") await db.update(usersTable).set({ phoneVerified: true }).where(eq(usersTable.id, userId));

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "OTP verification failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/auth/resend-otp ─────────────────────────────────────────────────
router.post("/resend-otp", async (req, res) => {
  try {
    const { userId, type } = req.body;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const code = generateOTP();
    await db.update(otpCodesTable).set({ used: true }).where(and(eq(otpCodesTable.userId, userId), eq(otpCodesTable.type, type)));
    await db.insert(otpCodesTable).values({ userId, code, type, expiresAt: new Date(Date.now() + 30 * 60 * 1000) });

    res.json({ success: true, _devOtp: process.env.NODE_ENV === "development" ? code : undefined });
  } catch (err) {
    req.log.error({ err }, "Resend OTP failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/auth/security-setup ─────────────────────────────────────────────
router.post("/security-setup", async (req, res) => {
  try {
    const { userId, loginPin, preferredSecurity } = req.body;
    const updates: any = { lastActivity: new Date() };
    if (loginPin) updates.loginPin = hashPin(String(loginPin));
    if (preferredSecurity) updates.securityType = preferredSecurity;

    await db.update(usersTable).set(updates).where(eq(usersTable.id, userId));
    const sessionId = await createSession(userId, false, 30);

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    res.json({ success: true, token: sessionId, user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role } });
  } catch (err) {
    req.log.error({ err }, "Security setup failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/auth/forgot-password ────────────────────────────────────────────
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email?.toLowerCase()?.trim()));
    if (!user) { res.json({ success: true }); return; } // Don't reveal if email exists

    const code = generateOTP();
    await db.insert(otpCodesTable).values({ userId: user.id, code, type: "password_reset", expiresAt: new Date(Date.now() + 30 * 60 * 1000) });

    res.json({ success: true, userId: user.id, _devOtp: process.env.NODE_ENV === "development" ? code : undefined });
  } catch (err) {
    req.log.error({ err }, "Forgot password failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/auth/reset-password ─────────────────────────────────────────────
router.post("/reset-password", async (req, res) => {
  try {
    const { userId, code, newPassword } = req.body;
    const [otp] = await db.select().from(otpCodesTable).where(
      and(eq(otpCodesTable.userId, userId), eq(otpCodesTable.code, code), eq(otpCodesTable.type, "password_reset"), eq(otpCodesTable.used, false))
    );
    if (!otp || new Date() > otp.expiresAt) { res.status(400).json({ error: "Invalid or expired code" }); return; }

    await db.update(otpCodesTable).set({ used: true }).where(eq(otpCodesTable.id, otp.id));
    await db.update(usersTable).set({ passwordHash: hashPassword(newPassword) }).where(eq(usersTable.id, userId));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Reset password failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/auth/change-password ────────────────────────────────────────────
router.post("/change-password", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [session] = await db.select().from(userSessionsTable).where(eq(userSessionsTable.id, token));
    if (!session || new Date() > session.expiresAt) { res.status(401).json({ error: "Session expired" }); return; }

    const { currentPassword, newPassword, newPin } = req.body;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const credOk = hashPassword(currentPassword) === user.passwordHash ||
      currentPassword === user.seedPhrase || currentPassword === user.walletKeyCode;
    if (!credOk) { res.status(401).json({ error: "Current password is incorrect" }); return; }

    const updates: any = { passwordHash: hashPassword(newPassword), lastActivity: new Date() };
    if (newPin) updates.loginPin = hashPin(newPin);
    await db.update(usersTable).set(updates).where(eq(usersTable.id, session.userId));
    await db.insert(notificationsTable).values({
      userId: session.userId, title: "Password Changed",
      message: "Your password has been changed successfully.", type: "success",
    });
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Change password failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/auth/logout ──────────────────────────────────────────────────────
router.post("/logout", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token) await db.delete(userSessionsTable).where(eq(userSessionsTable.id, token));
    res.json({ success: true });
  } catch (_) {
    res.json({ success: true });
  }
});

// ── GET /api/auth/demo — IP-based demo account ────────────────────────────────
router.get("/demo", async (req, res) => {
  try {
    const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "127.0.0.1";
    const demoEmail = `demo_${crypto.createHash("md5").update(clientIp).digest("hex").slice(0, 8)}@demo.xpressprofx.com`;

    let [user] = await db.select().from(usersTable).where(eq(usersTable.email, demoEmail));
    if (!user) {
      const refCode = generateReferralCode();
      const seedPhrase = generateSeedPhrase();
      const [newUser] = await db.insert(usersTable).values({
        fullName: "Demo Trader",
        username: `demo_${crypto.randomBytes(3).toString("hex")}`,
        email: demoEmail, passwordHash: hashPassword(`demo_${clientIp}`),
        loginPin: hashPin("000000"), country: "United Kingdom",
        referralCode: refCode, seedPhrase, walletKeyCode: generateWalletKeyCode(),
        kycStatus: "unverified", role: "user", isNewUser: true, emailVerified: true,
        referralValidUntil: new Date(Date.now() + 90 * 24 * 3600 * 1000),
      }).returning();
      user = newUser;

      const mainWalletId = crypto.randomUUID();
      const tradingWalletId = crypto.randomUUID();
      await db.insert(walletsTable).values([
        { id: mainWalletId, userId: user.id, type: "main", currency: "USDC", balance: (10000 + Math.random() * 5000).toFixed(2), label: "Main Wallet", address: generateWalletAddress() },
        { id: tradingWalletId, userId: user.id, type: "trading", currency: "USDC", balance: (2500 + Math.random() * 1000).toFixed(2), label: "Trading Wallet", address: generateWalletAddress() },
        { userId: user.id, type: "social", currency: "USDC", balance: "0", label: "Social Trading Wallet", address: generateWalletAddress() },
      ]);
      await db.insert(transactionsTable).values([
        { walletId: mainWalletId, userId: user.id, type: "deposit", amount: "10000", currency: "USDC", status: "completed", description: "Demo welcome deposit" },
        { walletId: tradingWalletId, userId: user.id, type: "trade_profit", amount: "234.56", currency: "USDC", status: "completed", description: "EUR/USD demo trade" },
      ]);
      await db.insert(notificationsTable).values({
        userId: user.id, title: "Welcome to XpressProFX Demo",
        message: "Your demo account is ready. Explore all features with $10,000 virtual funds.",
        type: "success", link: "/dashboard",
      });
    }

    const sessionId = await createSession(user.id, false, 1);
    res.json({
      token: sessionId,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, kycStatus: user.kycStatus, isDemo: true },
    });
  } catch (err) {
    req.log.error({ err }, "Demo account failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin reps management (head admin only) ────────────────────────────────────
router.get("/admin-reps", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
    const [session] = await db.select().from(userSessionsTable).where(eq(userSessionsTable.id, token));
    if (!session?.isAdmin) { res.status(403).json({ error: "Admin access required" }); return; }

    const reps = await db.select().from(adminRepsTable);
    res.json(reps);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin-reps", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
    const [session] = await db.select().from(userSessionsTable).where(eq(userSessionsTable.id, token));
    if (!session?.isAdmin) { res.status(403).json({ error: "Admin access required" }); return; }

    // Only head admin can add reps — check users table then admin_reps table for email
    const [sessionUser] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
    const [sessionRep] = await db.select().from(adminRepsTable).where(eq(adminRepsTable.id, session.userId));
    const sessionEmail = (sessionUser?.email || sessionRep?.email || "").toLowerCase();
    const isHead = sessionEmail === _headAdmin().toLowerCase();

    if (!isHead) {
      res.status(403).json({ error: "Only the head administrator can add admin representatives" }); return;
    }

    const { email } = req.body;
    if (!email) { res.status(400).json({ error: "Email is required" }); return; }

    const [existing] = await db.select().from(adminRepsTable).where(eq(adminRepsTable.email, email.toLowerCase().trim()));
    if (existing) {
      await db.update(adminRepsTable).set({ isActive: true }).where(eq(adminRepsTable.email, email.toLowerCase().trim()));
    } else {
      await db.insert(adminRepsTable).values({ email: email.toLowerCase().trim(), addedBy: "head", isActive: true });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin-reps/:email", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
    const [session] = await db.select().from(userSessionsTable).where(eq(userSessionsTable.id, token));
    if (!session?.isAdmin) { res.status(403).json({ error: "Admin access required" }); return; }

    await db.update(adminRepsTable).set({ isActive: false }).where(eq(adminRepsTable.email, req.params.email));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
