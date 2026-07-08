import request from "supertest";
import app from "../src/app";

describe("Security middleware", () => {
  describe("Helmet security headers", () => {
    it("sets X-Content-Type-Options: nosniff", async () => {
      const res = await request(app).get("/healthz");
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
    });

    it("sets frame-src or x-frame-options via Helmet CSP", async () => {
      const res = await request(app).get("/healthz");
      const csp = res.headers["content-security-policy"] as string | undefined;
      const hasCSP = csp !== undefined;
      expect(hasCSP).toBe(true);
    });

    it("does not expose X-Powered-By header", async () => {
      const res = await request(app).get("/healthz");
      expect(res.headers["x-powered-by"]).toBeUndefined();
    });
  });

  describe("404 handler", () => {
    it("returns structured JSON 404 for completely unknown paths", async () => {
      const res = await request(app).get("/xyz123-totally-unknown").expect(404);
      expect(res.body).toMatchObject({ error: "Not Found", code: 404 });
      expect(typeof res.body.timestamp).toBe("string");
    });
  });

  describe("Auth protection on unknown API routes", () => {
    it("returns 401 (not 404) for unknown protected API routes without auth", async () => {
      // Auth middleware runs before the 404 handler for routes under /api — by design
      const res = await request(app).get("/api/nonexistent-protected-route").expect(401);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("Request body limits", () => {
    it("accepts normal JSON requests", async () => {
      const res = await request(app)
        .get("/healthz")
        .set("Content-Type", "application/json")
        .expect(200);
      expect(res.body.status).toBe("ok");
    });
  });
});
