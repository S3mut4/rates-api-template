import { expect, test } from "@playwright/test";
import { StatusCodes } from "http-status-codes";

const boundaryInvalidBodies = [
  { id: "TC-002", description: "rate equal to 0", body: { rate: 0 } },
  {
    id: "TC-003",
    description: "rate greater than 1000000",
    body: { rate: 1000000.01 },
  },
];

const negativeInvalidBodies = [
  {
    id: "TC-004",
    description: "too short currency code",
    body: { currency: "XX", rate: 0.95 },
  },
  {
    id: "TC-005",
    description: "lowercase currency code",
    body: { currency: "chf", rate: 0.95 },
  },
  { id: "TC-006", description: "negative rate", body: { rate: -1 } },
  { id: "TC-007", description: "non-numeric rate", body: { rate: "RU" } },
  { id: "TC-008", description: "numeric string rate", body: { rate: "0.95" } },
  { id: "TC-009", description: "null rate", body: { rate: null } },
  { id: "TC-010", description: "missing rate", body: {} },
];

test.describe("POST /api/rates", () => {
  test.describe("Positive", () => {
    test("TC-001 creates new currency and returns 201", async ({ request }) => {
      const response = await request.post("/api/rates", {
        data: { currency: "XXX", rate: 0.95 },
      });
      expect(response.status()).toBe(StatusCodes.CREATED);
      expect(await response.json()).toEqual({ currency: "XXX", rate: 0.95 });

      const responseDelete = await request.delete("/api/rates/XXX");
      expect(responseDelete.status()).toBe(StatusCodes.NO_CONTENT);
    });
  });

  test.describe("Boundary", () => {
    for (const { id, description, body } of boundaryInvalidBodies) {
      test(`${id} returns 400 for ${description}`, async ({ request }) => {
        const response = await request.post("/api/rates", {
          data: { currency: "XXX", ...body },
        });
        expect(response.status()).toBe(StatusCodes.BAD_REQUEST);
        expect(await response.json()).toHaveProperty("error");
      });
    }
  });

  test.describe("Negative", () => {
    for (const { id, description, body } of negativeInvalidBodies) {
      test(`${id} returns 400 for ${description}`, async ({ request }) => {
        const response = await request.post("/api/rates", {
          data: { currency: "XXX", ...body },
        });
        expect(response.status()).toBe(StatusCodes.BAD_REQUEST);
        expect(await response.json()).toHaveProperty("error");
      });
    }

    test("TC-011 returns 400 for invalid JSON", async ({ request }) => {
      const response = await request.post("/api/rates", {
        data: '{"currency": "XXX",',
        headers: { "Content-Type": "application/json" },
      });
      expect(response.status()).toBe(StatusCodes.BAD_REQUEST);
    });

    test("TC-012 returns 409 when currency already exists", async ({
      request,
    }) => {
      const response = await request.post("/api/rates", {
        data: { currency: "USD", rate: 1.08 },
      });
      expect(response.status()).toBe(StatusCodes.CONFLICT);
    });

    test("TC-013 returns 413 for body larger than 10000 bytes", async ({
      request,
    }) => {
      const response = await request.post("/api/rates", {
        data: { currency: "XXX", rate: 0.95, padding: "a".repeat(10001) },
      });
      expect(response.status()).toBe(StatusCodes.REQUEST_TOO_LONG);
    });
  });
});
