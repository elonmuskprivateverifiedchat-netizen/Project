import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, otpCodesTable, walletsTable, transactionsTable, notificationsTable, referralBonusesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

const router: IRouter = Router();

const ADMIN_EMAIL = "admin@admin.com";
const ADMIN_SEED_PHRASE = Array(12).fill("admin@admin.com").join(" ");
const ADMIN_SEED_PHRASE_24 = Array(24).fill("admin@admin.com").join(" ");
const ADMIN_PRIVATE_KEY = "8157257198001";
const ADMIN_LOGIN_CODE = "999777";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "expresspro101_salt").digest("hex");
}

function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(pin + "pin_salt_expresspro").digest("hex");
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateReferralCode(): string {
  return "XPF" + crypto.randomBytes(4).toString("hex").toUpperCase();
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
    "apart","apology","appear","apple","approve","april","arch","arctic","area","arena",
    "argue","arm","armed","armor","army","around","arrange","arrest","arrive","arrow"
  ];
  const phrase = [];
  for (let i = 0; i < 24; i++) {
    phrase.push(words[Math.floor(Math.random() * words.length)]);
  }
  return phrase.join(" ");
}

function generateWalletKeyCode(): string {
  return "EXP-" + crypto.randomBytes(16).toString("hex").toUpperCase();
}

function generateSessionToken(userId: string): string {
  return Buffer.from(`${userId}:${Date.now()}:${crypto.randomBytes(16).toString("hex")}`).toString("base64");
}

// In-memory session store
const sessions = new Map<string, { userId: string; createdAt: number; isAdmin?: boolean }>();

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { firstName, middleName, lastName, fullName, username, email, phone, country, password, activeBot = "guardian", referralCode } = req.body;
    const resolvedFullName = [firstName, middleName, lastName].filter(Boolean).join(" ").trim() || fullName;
    if (!firstName?.trim() || !lastName?.trim()) {
      res.status(400).json({ error: "First name and last name are required" });
      return;
    }
    if (!resolvedFullName || !username || !email || !phone || !country || !password) {
      res.status(400).json({ error: "All required fields must be completed" });
      return;
    }

    const existing = await db.select({ id: usersTable.id }).from(usersTable)
      .where(eq(usersTable.email, email));
    if (existing.length) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }
    const existingUsername = await db.select({ id: usersTable.id }).from(usersTable)
      .where(eq(usersTable.username, username));
    if (existingUsername.length) {
      res.status(409).json({ error: "Username already taken" });
      return;
    }

    // Validate referral code
    let referrerId: string | null = null;
    let referralValid = false;
    if (referralCode) {
      const referrers = await db.select().from(usersTable).where(eq(usersTable.referralCode, referralCode));
      if (referrers.length) {
        const referrer = referrers[0];
        if (!referrer.referralValidUntil || new Date() < referrer.referralValidUntil) {
          referrerId = referrer.id;
          referralValid = true;
        }
      }
    }

    const passwordHash = hashPassword(password);
    const newReferralCode = generateReferralCode();
    // New users get 3 months referral validity, old users get 1 month
    const referralValidUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 3 months

    const [user] = await db.insert(usersTable).values({
      fullName: resolvedFullName,
      username,
      email,
      phone,
      country,
      passwordHash,
      role: "user",
      kycStatus: "unverified",
      emailVerified: false,
      phoneVerified: false,
      referralCode: newReferralCode,
      referredBy: referrerId || null,
      referralValidUntil,
      isNewUser: true,
    }).returning();

    // Create wallets
    const mainAddress = "EXP" + crypto.randomBytes(12).toString("hex").toUpperCase();
    const tradingAddress = "EXP" + crypto.randomBytes(12).toString("hex").toUpperCase();
    const socialAddress = "EXP" + crypto.randomBytes(12).toString("hex").toUpperCase();
    const fiatAddress = "EXP" + crypto.randomBytes(12).toString("hex").toUpperCase();
    const p2pAddress = "EXP" + crypto.randomBytes(12).toString("hex").toUpperCase();

    await db.insert(walletsTable).values([
      { userId: user.id, type: "main", label: "Main Account Wallet", currency: "USDC", balance: "0", address: mainAddress },
      { userId: user.id, type: "trading", label: "Trading Wallet", currency: "USDC", balance: "0", address: tradingAddress },
      { userId: user.id, type: "social", label: "Social Trading Wallet", currency: "USDC", balance: "0", address: socialAddress },
      { userId: user.id, type: "fiat", label: "Fiat Currency Wallet", currency: "USDC", balance: "0", address: fiatAddress },
      { userId: user.id, type: "p2p", label: "P2P Wallet", currency: "USDC", balance: "0", address: p2pAddress },
    ]);

    // Credit referral bonus if valid referral
    if (referralValid && referrerId) {
      await db.insert(referralBonusesTable).values({
        referrerId,
        referredUserId: user.id,
        bonusAmount: "500",
        status: "pending",
      });
      await db.insert(notificationsTable).values({
        userId: referrerId,
        title: "Referral Bonus Pending",
        message: `Your referral ${resolvedFullName} has registered! A $500 bonus will be credited once they start trading.`,
        type: "success",
        link: "/wallet",
      });
    }

    await db.insert(notificationsTable).values({
      userId: user.id,
      title: "AI Account Bot Activated",
      message: `${activeBot} is active for account guidance, protection alerts, and navigation help. Money movement requests still require a human representative.`,
      type: "success",
      link: "/support",
    });

    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await db.insert(otpCodesTable).values({
      userId: user.id,
      code: otpCode,
      type: "email_verify",
      expiresAt,
    });

    req.log.info({ email, otpCode }, "Email OTP sent");

    res.status(201).json({
      userId: user.id,
      message: "Registration successful. Please verify your email.",
      otpSent: true,
      referralCode: newReferralCode,
      ...(process.env.NODE_ENV !== "production" && { _devOtp: otpCode }),
    });
  } catch (err) {
    req.log.error({ err }, "Registration failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/admin-login
router.post("/admin-login", async (req, res) => {
  try {
    const { email, securityCredential, loginCode } = req.body;
    if (!email || !securityCredential || !loginCode) {
      res.status(400).json({ error: "Email, security credential, and login code are required" });
      return;
    }

    if (email.trim().toLowerCase() !== ADMIN_EMAIL) {
      res.status(401).json({ error: "Invalid admin credentials" });
      return;
    }

    const credentialOk =
      securityCredential.trim() === ADMIN_SEED_PHRASE ||
      securityCredential.trim() === ADMIN_SEED_PHRASE_24 ||
      securityCredential.trim() === ADMIN_PRIVATE_KEY;

    if (!credentialOk) {
      res.status(401).json({ error: "Invalid security credential" });
      return;
    }

    if (String(loginCode).trim() !== ADMIN_LOGIN_CODE) {
      res.status(401).json({ error: "Invalid login code" });
      return;
    }

    const token = generateSessionToken("admin-system");
    sessions.set(token, { userId: "admin-system", createdAt: Date.now(), isAdmin: true });

    res.json({
      success: true,
      token,
      isAdmin: true,
      user: {
        id: "admin-system",
        email: ADMIN_EMAIL,
        fullName: "System Administrator",
        role: "admin",
      },
    });
  } catch (err) {
    req.log.error({ err }, "Admin login failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/verify-otp
router.post("/verify-otp", async (req, res) => {
  try {
    const { userId, code, type } = req.body;
    if (!userId || !code || !type) {
      res.status(400).json({ error: "userId, code, and type are required" });
      return;
    }

    const otps = await db.select().from(otpCodesTable).where(
      and(
        eq(otpCodesTable.userId, userId),
        eq(otpCodesTable.code, code),
        eq(otpCodesTable.type, type),
        eq(otpCodesTable.used, false),
      )
    );

    const otp = otps[0];
    if (!otp) {
      res.status(400).json({ error: "Invalid or expired OTP code" });
      return;
    }

    if (new Date() > otp.expiresAt) {
      res.status(400).json({ error: "OTP code has expired" });
      return;
    }

    await db.update(otpCodesTable).set({ used: true }).where(eq(otpCodesTable.id, otp.id));

    if (type === "email_verify") {
      await db.update(usersTable).set({ emailVerified: true }).where(eq(usersTable.id, userId));
    } else if (type === "phone_verify") {
      await db.update(usersTable).set({ phoneVerified: true }).where(eq(usersTable.id, userId));
    }

    res.json({ success: true, message: "Verification successful" });
  } catch (err) {
    req.log.error({ err }, "OTP verification failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/resend-otp
router.post("/resend-otp", async (req, res) => {
  try {
    const { userId, type } = req.body;
    if (!userId || !type) {
      res.status(400).json({ error: "userId and type are required" });
      return;
    }

    const users = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!users.length) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await db.insert(otpCodesTable).values({ userId, code: otpCode, type, expiresAt });

    req.log.info({ userId, otpCode, type }, "OTP resent");

    res.json({
      success: true,
      message: "OTP resent successfully",
      ...(process.env.NODE_ENV !== "production" && { _devOtp: otpCode }),
    });
  } catch (err) {
    req.log.error({ err }, "Resend OTP failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/setup-security
router.post("/setup-security", async (req, res) => {
  try {
    const { userId, securityType, loginPin } = req.body;
    if (!userId || !securityType || !loginPin) {
      res.status(400).json({ error: "userId, securityType, and loginPin are required" });
      return;
    }

    const seedPhrase = securityType === "seed" ? generateSeedPhrase() : undefined;
    const walletKeyCode = securityType === "key" ? generateWalletKeyCode() : undefined;
    const pinHash = hashPin(loginPin);

    await db.update(usersTable).set({
      securityType,
      seedPhrase,
      walletKeyCode,
      loginPin: pinHash,
    }).where(eq(usersTable.id, userId));

    await db.insert(notificationsTable).values({
      userId,
      title: "Welcome to XpressProFX!",
      message: "Your account has been set up successfully. Complete KYC to unlock full trading access.",
      type: "success",
    });

    res.json({
      success: true,
      seedPhrase: seedPhrase ?? null,
      walletKeyCode: walletKeyCode ?? null,
      message: "Security credentials generated. Please save them securely.",
    });
  } catch (err) {
    req.log.error({ err }, "Security setup failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, securityCredential, loginPin } = req.body;
    if (!email || !securityCredential || !loginPin) {
      res.status(400).json({ error: "Email, security credential, and PIN are required" });
      return;
    }

    const users = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (!users.length) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const user = users[0];

    const credentialMatches =
      (user.seedPhrase && user.seedPhrase === securityCredential) ||
      (user.walletKeyCode && user.walletKeyCode === securityCredential) ||
      (user.passwordHash && user.passwordHash === hashPassword(securityCredential));

    if (!credentialMatches) {
      res.status(401).json({ error: "Invalid security credential" });
      return;
    }

    if (user.loginPin && user.loginPin !== hashPin(loginPin)) {
      res.status(401).json({ error: "Invalid PIN" });
      return;
    }

    await db.update(usersTable).set({ lastActivity: new Date() }).where(eq(usersTable.id, user.id));

    const token = generateSessionToken(user.id);
    sessions.set(token, { userId: user.id, createdAt: Date.now() });

    res.json({
      success: true,
      token,
      userId: user.id,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        kycStatus: user.kycStatus,
        kycVerified: user.kycVerified,
        emailVerified: user.emailVerified,
        referralCode: user.referralCode,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Login failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/replit/login", async (_req, res) => {
  res.redirect("https://replit.com/login");
});

// POST /api/auth/logout
router.post("/logout", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token) sessions.delete(token);
  res.json({ success: true });
});

// GET /api/auth/session
router.get("/session", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "No session" });
    return;
  }
  const session = sessions.get(token);
  if (!session) {
    res.status(401).json({ error: "Invalid session" });
    return;
  }
  if (Date.now() - session.createdAt > 60 * 60 * 1000) {
    sessions.delete(token);
    res.status(401).json({ error: "Session expired" });
    return;
  }

  if (session.isAdmin) {
    res.json({ userId: "admin-system", role: "admin", isAdmin: true });
    return;
  }

  try {
    const users = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
    if (!users.length) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    const user = users[0];
    res.json({ userId: user.id, role: user.role });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const users = await db.select({ id: usersTable.id, fullName: usersTable.fullName })
      .from(usersTable).where(eq(usersTable.email, email));

    if (!users.length) {
      res.json({ success: true, message: "If that email exists, a reset code has been sent." });
      return;
    }

    const user = users[0];
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await db.insert(otpCodesTable).values({ userId: user.id, code: otpCode, type: "password_reset", expiresAt });

    req.log.info({ email, otpCode }, "Password reset OTP sent");

    res.json({
      success: true,
      userId: user.id,
      message: "If that email exists, a reset code has been sent.",
      ...(process.env.NODE_ENV !== "production" && { _devOtp: otpCode }),
    });
  } catch (err) {
    req.log.error({ err }, "Forgot password failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
  try {
    const { userId, code, newPassword, newPin } = req.body;
    if (!userId || !code || !newPassword) {
      res.status(400).json({ error: "userId, code, and newPassword are required" });
      return;
    }

    const otps = await db.select().from(otpCodesTable).where(
      and(
        eq(otpCodesTable.userId, userId),
        eq(otpCodesTable.code, code),
        eq(otpCodesTable.type, "password_reset"),
        eq(otpCodesTable.used, false),
      )
    );

    const otp = otps[0];
    if (!otp || new Date() > otp.expiresAt) {
      res.status(400).json({ error: "Invalid or expired reset code" });
      return;
    }

    await db.update(otpCodesTable).set({ used: true }).where(eq(otpCodesTable.id, otp.id));

    const updates: Record<string, any> = {
      passwordHash: hashPassword(newPassword),
      lastActivity: new Date(),
    };
    if (newPin) updates.loginPin = hashPin(newPin);

    await db.update(usersTable).set(updates).where(eq(usersTable.id, userId));

    for (const [token, session] of sessions.entries()) {
      if (session.userId === userId) sessions.delete(token);
    }

    await db.insert(notificationsTable).values({
      userId,
      title: "Password Reset Successful",
      message: "Your password has been reset successfully. Please log in with your new credentials.",
      type: "info",
    });

    res.json({ success: true, message: "Password reset successfully. Please log in." });
  } catch (err) {
    req.log.error({ err }, "Reset password failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/change-password
router.post("/change-password", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) { res.status(401).json({ error: "Authentication required" }); return; }
  const session = sessions.get(token);
  if (!session) { res.status(401).json({ error: "Invalid session" }); return; }

  try {
    const { currentPassword, newPassword, newPin } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: "Current and new password are required" });
      return;
    }

    const users = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
    if (!users.length) { res.status(404).json({ error: "User not found" }); return; }
    const user = users[0];

    const credentialMatches =
      user.passwordHash === hashPassword(currentPassword) ||
      user.seedPhrase === currentPassword ||
      user.walletKeyCode === currentPassword;

    if (!credentialMatches) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }

    const updates: Record<string, any> = {
      passwordHash: hashPassword(newPassword),
      lastActivity: new Date(),
    };
    if (newPin) updates.loginPin = hashPin(newPin);

    await db.update(usersTable).set(updates).where(eq(usersTable.id, session.userId));

    await db.insert(notificationsTable).values({
      userId: session.userId,
      title: "Password Changed",
      message: "Your password has been changed successfully.",
      type: "success",
    });

    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    req.log.error({ err }, "Change password failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/auth/demo — auto-create or retrieve IP-based demo account
router.get("/demo", async (req, res) => {
  try {
    const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
      || req.socket.remoteAddress
      || "127.0.0.1";

    const demoEmail = `demo_${crypto.createHash("md5").update(clientIp).digest("hex").slice(0, 8)}@demo.expressprofx.com`;

    let [user] = await db.select().from(usersTable).where(eq(usersTable.email, demoEmail));

    if (!user) {
      // Create demo user
      const refCode = generateReferralCode();
      const [newUser] = await db.insert(usersTable).values({
        firstName: "Demo",
        middleName: "",
        lastName: "Trader",
        fullName: "Demo Trader",
        username: `demo_${crypto.randomBytes(3).toString("hex")}`,
        email: demoEmail,
        passwordHash: hashPassword(`demo_${clientIp}`),
        loginPin: hashPin("000000"),
        country: "United Kingdom",
        referralCode: refCode,
        kycStatus: "unverified",
        role: "user",
        isNewUser: true,
        emailVerified: true,
        referralValidUntil: new Date(Date.now() + 90 * 24 * 3600 * 1000),
      }).returning();
      user = newUser;

      // Create wallets with demo balances
      const mainWalletId = crypto.randomUUID();
      const tradingWalletId = crypto.randomUUID();

      await db.insert(walletsTable).values([
        { id: mainWalletId, userId: user.id, type: "main", currency: "USDC", balance: (10000 + Math.random() * 5000).toFixed(2), label: "Main Wallet" },
        { id: tradingWalletId, userId: user.id, type: "trading", currency: "USDC", balance: (2500 + Math.random() * 1000).toFixed(2), label: "Trading Wallet" },
        { userId: user.id, type: "social", currency: "USDC", balance: "0", label: "Social Trading Wallet" },
      ]);

      // Seed some demo transactions
      await db.insert(transactionsTable).values([
        { walletId: mainWalletId, userId: user.id, type: "deposit", amount: "10000", currency: "USDC", status: "completed", description: "Demo account welcome deposit" },
        { walletId: tradingWalletId, userId: user.id, type: "trade_profit", amount: "234.56", currency: "USDC", status: "completed", description: "EUR/USD trade profit" },
      ]);

      await db.insert(notificationsTable).values({
        userId: user.id,
        title: "Welcome to ExpressPro101 Demo",
        message: "Your demo trading account is ready. Explore all features risk-free with $10,000 demo funds.",
        type: "success",
        link: "/dashboard",
      });
    }

    // Create a demo session
    const sessionId = crypto.randomBytes(32).toString("hex");
    const token = crypto.randomBytes(32).toString("hex");
    sessions.set(sessionId, {
      userId: user.id,
      token,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      isAdmin: false,
    });

    res.json({
      token: sessionId,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        kycStatus: user.kycStatus,
        isDemo: true,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Demo account creation failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export { sessions };
export default router;
