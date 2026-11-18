const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app"); // Adjust the path to your main app file if needed

describe("Wanderlust Core Routes", () => {
  afterAll(async () => {
    await mongoose.connection.close();
  }, 30000);

  test("GET /listings should return 200 OK", async () => {
    const res = await request(app).get("/listings");
    expect(res.statusCode).toBe(200);
  }, 30000);

  test("GET /non-existent-route should return 404 Not Found", async () => {
    const res = await request(app).get("/some-random-invalid-route-123");
    expect(res.statusCode).toBe(404);
  }, 30000);
});