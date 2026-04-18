import crypto from "crypto";
import { db } from "@workspace/db";
import {
  usersTable, walletsTable, transactionsTable, tradesTable,
  managersTable, p2pListingsTable, assetCatalogTable, p2pNotificationsTable
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";
const DEMO_MAIN_WALLET_ID = "00000000-0000-0000-0000-000000000010";
const DEMO_TRADING_WALLET_ID = "00000000-0000-0000-0000-000000000011";
const DEMO_SOCIAL_WALLET_ID = "00000000-0000-0000-0000-000000000012";
const DEMO_FIAT_WALLET_ID = "00000000-0000-0000-0000-000000000013";
const DEMO_P2P_WALLET_ID = "00000000-0000-0000-0000-000000000014";
const DEMO_PASSWORD_HASH = crypto
  .createHash("sha256")
  .update(`${process.env.DEMO_PASSWORD ?? "Demo@2024"}expresspro101_salt`)
  .digest("hex");
const DEMO_SEED_PHRASE = process.env.DEMO_SEED_PHRASE ?? [
  "abandon", "ability", "able", "about", "above", "absent",
  "absorb", "abstract", "absurd", "abuse", "access", "accident",
  "account", "accuse", "achieve", "acid", "acoustic", "acquire",
  "across", "act", "action", "actor", "actress", "actual",
].join(" ");

async function seed() {
  console.log("Seeding database...");

  // Upsert demo user
  const existing = await db.select().from(usersTable).where(eq(usersTable.id, DEMO_USER_ID));
  if (!existing.length) {
    await db.insert(usersTable).values({
      id: DEMO_USER_ID,
      username: "alextrader",
      email: "alex@nextrade.io",
      fullName: "Alex Johnson",
      country: "US",
      kycVerified: true,
      avatarUrl: null,
    });
  }
  // Patch demo user with all required fields
  await db.execute(
    `UPDATE users SET
       phone = COALESCE(phone, '+447900123456'),
       password_hash = '${DEMO_PASSWORD_HASH}',
       seed_phrase = '${DEMO_SEED_PHRASE.replaceAll("'", "''")}',
       security_type = 'seed',
       login_pin = NULL,
       kyc_status = 'verified',
       kyc_verified = true,
       role = 'admin',
       ai_bot_trial_ends_at = NOW() + INTERVAL '90 days',
       ai_bot_subscription_status = 'trial',
       maintenance_due_at = NOW() + INTERVAL '30 days',
       maintenance_grace_ends_at = NOW() + INTERVAL '44 days',
       last_compulsory_trade_at = NOW(),
       trading_locked = false
     WHERE id = '${DEMO_USER_ID}'`
  );

  // Upsert wallets
  const existingWallets = await db.select().from(walletsTable).where(eq(walletsTable.userId, DEMO_USER_ID));
  if (!existingWallets.length) {
    await db.insert(walletsTable).values([
      {
        id: DEMO_MAIN_WALLET_ID,
        userId: DEMO_USER_ID,
        type: "main",
        label: "Main Account Wallet",
        currency: "USDC",
        balance: "25840.50",
        pendingBalance: "0",
        address: "NXT1A2B3C4D5E6F7G8H9I0J",
      },
      {
        id: DEMO_TRADING_WALLET_ID,
        userId: DEMO_USER_ID,
        type: "trading",
        label: "Trading Wallet",
        currency: "USDC",
        balance: "12500.00",
        pendingBalance: "3200.00",
        address: "NXT9Z8Y7X6W5V4U3T2S1R0Q",
      },
      {
        id: DEMO_SOCIAL_WALLET_ID,
        userId: DEMO_USER_ID,
        type: "social",
        label: "Social Trading Wallet",
        currency: "USDC",
        balance: "4850.75",
        pendingBalance: "1240.00",
        address: "NXT0P1O2N3M4L5K6J7I8H9G",
      },
      {
        id: DEMO_FIAT_WALLET_ID,
        userId: DEMO_USER_ID,
        type: "fiat",
        label: "Fiat Currency Wallet",
        currency: "USDC",
        balance: "2500.00",
        pendingBalance: "0",
        address: "NXT-FIAT-DEMO-001",
      },
      {
        id: DEMO_P2P_WALLET_ID,
        userId: DEMO_USER_ID,
        type: "p2p",
        label: "P2P Wallet",
        currency: "USDC",
        balance: "1000.00",
        pendingBalance: "0",
        address: "NXT-P2P-DEMO-001",
      },
    ]);

    // Transactions
    await db.insert(transactionsTable).values([
      {
        walletId: DEMO_MAIN_WALLET_ID,
        userId: DEMO_USER_ID,
        type: "deposit",
        amount: "5000.00",
        currency: "USD",
        status: "completed",
        description: "Bank wire deposit",
        createdAt: new Date(Date.now() - 7 * 24 * 3600000),
      },
      {
        walletId: DEMO_MAIN_WALLET_ID,
        userId: DEMO_USER_ID,
        type: "deposit",
        amount: "10000.00",
        currency: "USD",
        status: "completed",
        description: "Credit card deposit",
        createdAt: new Date(Date.now() - 5 * 24 * 3600000),
      },
      {
        walletId: DEMO_TRADING_WALLET_ID,
        userId: DEMO_USER_ID,
        type: "transfer",
        amount: "12500.00",
        currency: "USDT",
        status: "completed",
        description: "Transfer to trading wallet",
        createdAt: new Date(Date.now() - 4 * 24 * 3600000),
      },
      {
        walletId: DEMO_SOCIAL_WALLET_ID,
        userId: DEMO_USER_ID,
        type: "trade_profit",
        amount: "1240.00",
        currency: "USDT",
        status: "completed",
        description: "Profit from BTC/USDT trade",
        createdAt: new Date(Date.now() - 2 * 24 * 3600000),
      },
      {
        walletId: DEMO_MAIN_WALLET_ID,
        userId: DEMO_USER_ID,
        type: "withdrawal",
        amount: "2000.00",
        currency: "USD",
        status: "completed",
        description: "Bank withdrawal",
        createdAt: new Date(Date.now() - 1 * 24 * 3600000),
      },
      {
        walletId: DEMO_MAIN_WALLET_ID,
        userId: DEMO_USER_ID,
        type: "p2p_buy",
        amount: "500.00",
        currency: "USD",
        status: "completed",
        description: "P2P purchase of 0.01 BTC",
        createdAt: new Date(Date.now() - 3 * 3600000),
      },
    ]);
  }
  await db.execute(`UPDATE wallets SET currency = 'USDC' WHERE user_id = '${DEMO_USER_ID}'`);
  const refreshedWallets = await db.select().from(walletsTable).where(eq(walletsTable.userId, DEMO_USER_ID));
  if (!refreshedWallets.some(w => w.type === "fiat")) {
    await db.insert(walletsTable).values({
      id: DEMO_FIAT_WALLET_ID,
      userId: DEMO_USER_ID,
      type: "fiat",
      label: "Fiat Currency Wallet",
      currency: "USDC",
      balance: "2500.00",
      pendingBalance: "0",
      address: "NXT-FIAT-DEMO-001",
    });
  }
  if (!refreshedWallets.some(w => w.type === "p2p")) {
    await db.insert(walletsTable).values({
      id: DEMO_P2P_WALLET_ID,
      userId: DEMO_USER_ID,
      type: "p2p",
      label: "P2P Wallet",
      currency: "USDC",
      balance: "1000.00",
      pendingBalance: "0",
      address: "NXT-P2P-DEMO-001",
    });
  }

  // Seed managers
  const existingManagers = await db.select().from(managersTable);
  if (!existingManagers.length) {
    await db.insert(managersTable).values([
      {
        name: "Marcus Williams",
        title: "Senior Portfolio Manager",
        experience: 12,
        strategy: "Momentum + Swing Trading",
        performance: "142.50",
        totalClients: 287,
        winRate: "78.40",
        specialization: "BTC/ETH Major Pairs",
        bio: "Former Goldman Sachs quant analyst with over a decade of experience in digital asset markets. Specializes in high-probability momentum setups combined with macro trend analysis.",
        contactEmail: "marcus@nextrade.io",
        available: true,
      },
      {
        name: "Sarah Chen",
        title: "Algorithmic Trading Specialist",
        experience: 8,
        strategy: "AI-Powered Systematic Trading",
        performance: "118.20",
        totalClients: 193,
        winRate: "82.10",
        specialization: "Altcoins & DeFi Tokens",
        bio: "PhD in Financial Engineering from MIT. Developed proprietary ML models that consistently identify market inefficiencies. Expert in both CEX and DEX environments.",
        contactEmail: "sarah@nextrade.io",
        available: true,
      },
      {
        name: "James Okonkwo",
        title: "Risk Management Director",
        experience: 15,
        strategy: "Conservative Growth & Hedging",
        performance: "89.60",
        totalClients: 412,
        winRate: "91.30",
        specialization: "Portfolio Diversification",
        bio: "20 years combined experience in traditional and digital finance. Previously managed a $500M hedge fund. Known for capital preservation strategies with consistent returns.",
        contactEmail: "james@nextrade.io",
        available: true,
      },
      {
        name: "Elena Vasquez",
        title: "Crypto Derivatives Expert",
        experience: 6,
        strategy: "Options & Futures Strategies",
        performance: "163.80",
        totalClients: 142,
        winRate: "74.20",
        specialization: "Leveraged Trading",
        bio: "Options market maker background with deep expertise in crypto derivatives. Specializes in volatility trading and multi-leg strategies to maximize risk-adjusted returns.",
        contactEmail: "elena@nextrade.io",
        available: false,
      },
      {
        name: "David Park",
        title: "DeFi & Web3 Strategist",
        experience: 5,
        strategy: "DeFi Yield + On-chain Alpha",
        performance: "201.40",
        totalClients: 98,
        winRate: "69.80",
        specialization: "Emerging L1/L2 Ecosystems",
        bio: "Early DeFi pioneer who has been active since 2017. Expert in yield optimization, liquidity provision, and identifying early-stage protocols before mainstream adoption.",
        contactEmail: "david@nextrade.io",
        available: true,
      },
    ]);
  }
  const currentManagers = await db.select().from(managersTable);
  const requiredManagers = [
    {
      name: "Chris Lukeman",
      title: "USA Market Portfolio Manager",
      experience: 11,
      strategy: "US Equities + Crypto Rotation",
      performance: "134.80",
      totalClients: 245,
      winRate: "79.40",
      specialization: "United States client portfolios",
      bio: "USA-based manager focused on disciplined crypto accumulation, active risk controls, and account growth plans.",
      contactEmail: "chris.lukeman@expresspro101.com",
      available: true,
    },
    {
      name: "Roseline West",
      title: "USA Client Growth Manager",
      experience: 9,
      strategy: "AI-assisted trend trading",
      performance: "126.40",
      totalClients: 198,
      winRate: "81.10",
      specialization: "USDC and BTC portfolio growth",
      bio: "USA-based manager guiding users through trading programs, recurring plan reviews, and risk-managed market entries.",
      contactEmail: "roseline.west@expresspro101.com",
      available: true,
    },
    {
      name: "James Corner",
      title: "UK Senior Trade Manager",
      experience: 13,
      strategy: "Conservative crypto and forex allocation",
      performance: "119.70",
      totalClients: 301,
      winRate: "84.60",
      specialization: "United Kingdom client portfolios",
      bio: "UK-based manager specializing in compliant portfolio support, structured trade plans, and withdrawal readiness guidance.",
      contactEmail: "james.corner@expresspro101.com",
      available: true,
    },
  ];
  for (const manager of requiredManagers) {
    if (!currentManagers.some(item => item.name === manager.name)) {
      await db.insert(managersTable).values(manager);
    }
  }

  // Seed trades
  const existingTrades = await db.select().from(tradesTable).where(eq(tradesTable.userId, DEMO_USER_ID));
  if (!existingTrades.length) {
    const managers = await db.select().from(managersTable);
    const mgr0 = managers[0]?.id;
    const mgr1 = managers[1]?.id;

    await db.insert(tradesTable).values([
      {
        userId: DEMO_USER_ID,
        pair: "BTC/USDT",
        type: "long",
        status: "active",
        entryPrice: "62400.00",
        currentPrice: "65820.00",
        targetPrice: "72000.00",
        amount: "1500.00",
        currency: "USDT",
        profit: "820.00",
        expectedProfit: "2340.00",
        managerId: mgr0 ?? null,
        createdAt: new Date(Date.now() - 3 * 24 * 3600000),
      },
      {
        userId: DEMO_USER_ID,
        pair: "ETH/USDT",
        type: "long",
        status: "active",
        entryPrice: "3180.00",
        currentPrice: "3420.00",
        targetPrice: "3900.00",
        amount: "800.00",
        currency: "USDT",
        profit: "420.00",
        expectedProfit: "1080.00",
        managerId: mgr1 ?? null,
        createdAt: new Date(Date.now() - 2 * 24 * 3600000),
      },
      {
        userId: DEMO_USER_ID,
        pair: "SOL/USDT",
        type: "short",
        status: "active",
        entryPrice: "145.50",
        currentPrice: "138.20",
        targetPrice: "120.00",
        amount: "500.00",
        currency: "USDT",
        profit: "180.00",
        expectedProfit: "480.00",
        managerId: mgr0 ?? null,
        createdAt: new Date(Date.now() - 1 * 24 * 3600000),
      },
      {
        userId: DEMO_USER_ID,
        pair: "BTC/USDT",
        type: "long",
        status: "completed",
        entryPrice: "58200.00",
        currentPrice: "63400.00",
        targetPrice: "63000.00",
        amount: "2000.00",
        currency: "USDT",
        profit: "1240.00",
        expectedProfit: "1200.00",
        managerId: mgr1 ?? null,
        createdAt: new Date(Date.now() - 14 * 24 * 3600000),
        completedAt: new Date(Date.now() - 7 * 24 * 3600000),
      },
      {
        userId: DEMO_USER_ID,
        pair: "MATIC/USDT",
        type: "long",
        status: "completed",
        entryPrice: "0.82",
        currentPrice: "1.14",
        targetPrice: "1.10",
        amount: "600.00",
        currency: "USDT",
        profit: "380.00",
        expectedProfit: "350.00",
        managerId: mgr0 ?? null,
        createdAt: new Date(Date.now() - 20 * 24 * 3600000),
        completedAt: new Date(Date.now() - 12 * 24 * 3600000),
      },
    ]);
  }

  // Seed P2P listings
  const existingListings = await db.select().from(p2pListingsTable);
  if (!existingListings.length) {
    await db.insert(p2pListingsTable).values([
      {
        userId: "00000000-0000-0000-0000-000000000050",
        userName: "CryptoKing_88",
        type: "sell",
        asset: "BTC",
        amount: "0.5",
        price: "65800.00",
        currency: "USD",
        minOrder: "100.00",
        maxOrder: "32900.00",
        paymentMethods: ["Bank Transfer", "PayPal"],
        completionRate: "99.20",
        totalTrades: 847,
        status: "active",
      },
      {
        userId: "00000000-0000-0000-0000-000000000051",
        userName: "EuroTrader_Pro",
        type: "sell",
        asset: "ETH",
        amount: "10.0",
        price: "3420.00",
        currency: "EUR",
        minOrder: "50.00",
        maxOrder: "34200.00",
        paymentMethods: ["SEPA Transfer", "Wise"],
        completionRate: "97.80",
        totalTrades: 423,
        status: "active",
      },
      {
        userId: "00000000-0000-0000-0000-000000000052",
        userName: "AfriCrypto_Hub",
        type: "buy",
        asset: "BTC",
        amount: "0.3",
        price: "65500.00",
        currency: "USD",
        minOrder: "200.00",
        maxOrder: "19650.00",
        paymentMethods: ["M-Pesa", "Bank Transfer"],
        completionRate: "95.60",
        totalTrades: 218,
        status: "active",
      },
      {
        userId: "00000000-0000-0000-0000-000000000053",
        userName: "UKCryptoDesk",
        type: "sell",
        asset: "USDT",
        amount: "50000.0",
        price: "1.00",
        currency: "GBP",
        minOrder: "100.00",
        maxOrder: "50000.00",
        paymentMethods: ["Faster Payments", "CHAPS"],
        completionRate: "99.80",
        totalTrades: 1243,
        status: "active",
      },
      {
        userId: "00000000-0000-0000-0000-000000000054",
        userName: "CanadaFX_Trader",
        type: "buy",
        asset: "ETH",
        amount: "5.0",
        price: "3380.00",
        currency: "CAD",
        minOrder: "100.00",
        maxOrder: "16900.00",
        paymentMethods: ["Interac e-Transfer", "Wire Transfer"],
        completionRate: "96.40",
        totalTrades: 156,
        status: "active",
      },
      {
        userId: "00000000-0000-0000-0000-000000000055",
        userName: "GlobalSwap_Pro",
        type: "sell",
        asset: "SOL",
        amount: "200.0",
        price: "138.50",
        currency: "USD",
        minOrder: "50.00",
        maxOrder: "27700.00",
        paymentMethods: ["PayPal", "Venmo", "Zelle"],
        completionRate: "98.10",
        totalTrades: 392,
        status: "active",
      },
    ]);
  }

  // Seed asset catalog
  const existingAssets = await db.select().from(assetCatalogTable);
  if (!existingAssets.length) {
    await db.insert(assetCatalogTable).values([
      { symbol: "BTC", name: "Bitcoin", price: "65823.40", currency: "USD", change24h: "2.34", available: true },
      { symbol: "ETH", name: "Ethereum", price: "3421.80", currency: "USD", change24h: "1.87", available: true },
      { symbol: "SOL", name: "Solana", price: "138.20", currency: "USD", change24h: "-0.92", available: true },
      { symbol: "USDT", name: "Tether", price: "1.00", currency: "USD", change24h: "0.01", available: true },
      { symbol: "BNB", name: "BNB", price: "412.50", currency: "USD", change24h: "3.12", available: true },
      { symbol: "XRP", name: "XRP", price: "0.5820", currency: "USD", change24h: "-1.43", available: true },
      { symbol: "MATIC", name: "Polygon", price: "1.14", currency: "USD", change24h: "4.21", available: true },
      { symbol: "AVAX", name: "Avalanche", price: "38.90", currency: "USD", change24h: "2.76", available: true },
      { symbol: "DOT", name: "Polkadot", price: "8.42", currency: "USD", change24h: "-0.55", available: true },
      { symbol: "LINK", name: "Chainlink", price: "14.60", currency: "USD", change24h: "5.18", available: true },
      { symbol: "ADA", name: "Cardano", price: "0.4820", currency: "USD", change24h: "1.23", available: true },
      { symbol: "DOGE", name: "Dogecoin", price: "0.1284", currency: "USD", change24h: "6.44", available: true },
    ]);
  }

  // Seed P2P notifications
  const existingNotifs = await db.select().from(p2pNotificationsTable)
    .where(eq(p2pNotificationsTable.userId, DEMO_USER_ID));
  if (!existingNotifs.length) {
    await db.insert(p2pNotificationsTable).values([
      {
        userId: DEMO_USER_ID,
        type: "deposit_confirmed",
        title: "P2P Deposit Confirmed",
        message: "Your P2P deposit of 0.01 BTC has been confirmed. Funds are now in your main wallet.",
        read: false,
        createdAt: new Date(Date.now() - 2 * 3600000),
      },
      {
        userId: DEMO_USER_ID,
        type: "admin_message",
        title: "KYC Verification Complete",
        message: "Your identity verification has been approved. You can now trade with higher limits.",
        read: true,
        createdAt: new Date(Date.now() - 24 * 3600000),
      },
    ]);
  }

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
