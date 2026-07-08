import request from "supertest";
import app from "../src/app";

describe("Trading / Forex routes (public)", () => {
  describe("GET /api/trading/pairs", () => {
    it("returns 200 with pairs array", async () => {
      const res = await request(app).get("/api/trading/pairs").expect(200);
      expect(Array.isArray(res.body.pairs)).toBe(true);
      expect(res.body.pairs.length).toBeGreaterThan(0);
      expect(res.body.pairs[0]).toHaveProperty("pair");
      expect(res.body.pairs[0]).toHaveProperty("base");
      expect(res.body.pairs[0]).toHaveProperty("quote");
      expect(res.body.pairs[0]).toHaveProperty("category");
    });
  });

  describe("GET /api/trading/rates", () => {
    it("returns 200 with live rates for all pairs", async () => {
      const res = await request(app).get("/api/trading/rates").expect(200);
      expect(Array.isArray(res.body.rates)).toBe(true);
      expect(res.body.rates.length).toBeGreaterThan(0);
      const rate = res.body.rates[0];
      expect(rate).toHaveProperty("pair");
      expect(rate).toHaveProperty("bid");
      expect(rate).toHaveProperty("ask");
      expect(rate).toHaveProperty("mid");
      expect(typeof rate.bid).toBe("number");
      expect(rate.ask).toBeGreaterThan(rate.bid);
    });

    it("returns filtered rates when pairs param provided", async () => {
      const res = await request(app).get("/api/trading/rates?pairs=EUR/USD,GBP/USD").expect(200);
      expect(res.body.rates).toHaveLength(2);
      const symbols = res.body.rates.map((r: { pair: string }) => r.pair);
      expect(symbols).toContain("EUR/USD");
      expect(symbols).toContain("GBP/USD");
    });
  });

  describe("GET /api/trading/rates/:pair", () => {
    it("returns 200 for valid pair", async () => {
      const res = await request(app).get("/api/trading/rates/EUR-USD").expect(200);
      expect(res.body.pair).toBe("EUR/USD");
      expect(res.body).toHaveProperty("bid");
      expect(res.body).toHaveProperty("ask");
    });

    it("returns 404 for invalid pair", async () => {
      const res = await request(app).get("/api/trading/rates/FAKE-PAIR").expect(404);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("POST /api/trading/order (protected)", () => {
    it("returns 401 without auth token", async () => {
      const res = await request(app)
        .post("/api/trading/order")
        .send({ pair: "EUR/USD", type: "market", direction: "buy", amount: 1000, walletId: "w1" })
        .expect(401);
      expect(res.body).toHaveProperty("error");
    });
  });
});
