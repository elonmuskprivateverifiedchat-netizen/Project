import request from "supertest";
import app from "../src/app";

describe("Investment routes (public plan listing)", () => {
  describe("GET /api/investment/plans — requires auth", () => {
    it("returns 401 without token", async () => {
      await request(app).get("/api/investment/plans").expect(401);
    });
  });

  describe("GET /api/trading/pairs — public", () => {
    it("includes all major forex pairs", async () => {
      const res = await request(app).get("/api/trading/pairs").expect(200);
      const pairSymbols = res.body.pairs.map((p: { pair: string }) => p.pair);
      expect(pairSymbols).toContain("EUR/USD");
      expect(pairSymbols).toContain("GBP/USD");
      expect(pairSymbols).toContain("USD/JPY");
      expect(pairSymbols).toContain("XAU/USD");
    });

    it("includes crypto pairs", async () => {
      const res = await request(app).get("/api/trading/pairs").expect(200);
      const pairSymbols = res.body.pairs.map((p: { pair: string }) => p.pair);
      expect(pairSymbols).toContain("BTC/USD");
      expect(pairSymbols).toContain("ETH/USD");
    });
  });
});
