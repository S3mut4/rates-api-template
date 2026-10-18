import { expect, test } from "@playwright/test";
import { StatusCodes } from "http-status-codes";

test.describe("POST /api/rates", () => {
  test("creates new currency and returns 201", async ({ request }) => {
    const response = await request.post("/api/rates", {
      data: { currency: "XXX", rate: 0.95 },
    });
    expect(response.status()).toBe(StatusCodes.CREATED);
    expect(await response.json()).toEqual({ currency: "XXX", rate: 0.95 });

    const responseDelete = await request.delete("/api/rates/XXX");
    expect(responseDelete.status()).toBe(StatusCodes.NO_CONTENT);
  });

  test("returns 400 for invalid currency code", async ({ request }) => {
    const response = await request.post("/api/rates", {
      data: { currency: "XX", rate: 0.95 },
    });
    expect(response.status()).toBe(StatusCodes.BAD_REQUEST);
  });

  test("returns 400 for rate equal to 0", async ({ request }) => {
    const response = await request.post("/api/rates", {
      data: { currency: "XXX", rate: 0 },
    });
    expect(response.status()).toBe(StatusCodes.BAD_REQUEST);
  });

  test("returns 400 for rate greater than 1000000", async ({ request }) => {
    const response = await request.post("/api/rates", {
      data: { currency: "XXX", rate: 1000001 },
    });
    expect(response.status()).toBe(StatusCodes.BAD_REQUEST);
  });

  test("returns 400 for non-numeric rate", async ({ request }) => {
    const response = await request.post("/api/rates", {
      data: { currency: "XXX", rate: "RU" },
    });
    expect(response.status()).toBe(StatusCodes.BAD_REQUEST);
  });

  test("returns 400 for missing rate", async ({ request }) => {
    const response = await request.post("/api/rates", {
      data: { currency: "XXX" },
    });
    expect(response.status()).toBe(StatusCodes.BAD_REQUEST);
  });

  test("returns 400 for invalid JSON", async ({ request }) => {
    const response = await request.post("/api/rates", {
      data: '{"currency": "XXX",',
      headers: { "Content-Type": "application/json" },
    });
    expect(response.status()).toBe(StatusCodes.BAD_REQUEST);
  });

  test("returns 409 when currency already exists", async ({ request }) => {
    const response = await request.post("/api/rates", {
      data: { currency: "USD", rate: 1.08 },
    });
    expect(response.status()).toBe(StatusCodes.CONFLICT);
  });

  test("returns 413 for body larger than 10000 bytes", async ({ request }) => {
    const response = await request.post("/api/rates", {
      data: { currency: "XXX", rate: 0.95, padding: "a".repeat(10001) },
    });
    expect(response.status()).toBe(StatusCodes.REQUEST_TOO_LONG);
  });
});
