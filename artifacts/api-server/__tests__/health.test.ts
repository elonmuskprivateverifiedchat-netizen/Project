import request from "supertest";
import app from "../src/app";

describe("Health endpoints", () => {
  it("GET /healthz returns 200 with status ok", async () => {
    const res = await request(app).get("/healthz").expect(200);
    expect(res.body).toMatchObject({ status: "ok" });
    expect(typeof res.body.uptime).toBe("number");
    expect(typeof res.body.timestamp).toBe("string");
  });

  it("GET /api/healthz returns 200 (API-mounted health)", async () => {
    const res = await request(app).get("/api/healthz").expect(200);
    expect(res.body).toMatchObject({ status: "ok" });
  });

  it("Server exposes uptime as a number", async () => {
    const res = await request(app).get("/healthz").expect(200);
    expect(res.body.uptime).toBeGreaterThanOrEqual(0);
  });
});
