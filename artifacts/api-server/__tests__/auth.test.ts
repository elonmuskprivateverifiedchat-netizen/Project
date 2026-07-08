import request from "supertest";
import app from "../src/app";

// Mock the database to avoid real DB calls in unit tests
jest.mock("@workspace/db", () => ({
  db: {
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
        limit: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      }),
    }),
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: "test-session-id" }]),
      }),
    }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      }),
    }),
    delete: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue([]),
    }),
    execute: jest.fn().mockResolvedValue({ rows: [{ "?column?": 1 }] }),
  },
}));

describe("Auth routes", () => {
  describe("POST /api/auth/register", () => {
    it("returns 400 when required fields are missing", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({})
        .expect(400);
      expect(res.body).toHaveProperty("error");
    });

    it("returns 400 for invalid email format", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "not-an-email", password: "Pass123!", username: "testuser" })
        .expect(400);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("POST /api/auth/login", () => {
    it("returns 400 when credentials are missing", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({})
        .expect(400);
      expect(res.body).toHaveProperty("error");
    });

    it("returns 401 for non-existent user", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "nonexistent@example.com", password: "Wrong123!" })
        .expect(401);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("Protected routes", () => {
    it("returns 401 without Authorization header", async () => {
      const res = await request(app).get("/api/users/me").expect(401);
      expect(res.body).toMatchObject({ error: "Authentication required" });
    });

    it("returns 401 with invalid token", async () => {
      const res = await request(app)
        .get("/api/users/me")
        .set("Authorization", "Bearer invalid-token-xxx")
        .expect(401);
      expect(res.body).toHaveProperty("error");
    });
  });
});
