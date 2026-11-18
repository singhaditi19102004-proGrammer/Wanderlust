const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");

describe("Wanderlust Core Routes", () => {
  afterAll(async () => {
    await mongoose.connection.close();
  });

  test("GET /listings should return 200 OK", async () => {
    const res = await request(app).get("/listings");
    expect(res.statusCode).toBe(200);
  });

  test("GET /non-existent-route should return 404 Not Found", async () => {
    const res = await request(app).get("/some-random-invalid-route-123");
    expect(res.statusCode).toBe(404);
  });
});