import { test, expect } from "@playwright/test";
import { StatusCodes } from "http-status-codes";
import { Currency, SEED_CURRENCIES } from "./currency";

const maxRate = 1000000;

const existingCurrencies = [
  { id: "TC-003", currency: Currency.USD },
  { id: "TC-004", currency: Currency.GBP },
  { id: "TC-005", currency: Currency.JPY },
];

const boundaryInvalidCodes = [
  { id: "TC-006", description: "too short currency code", code: "US" },
  { id: "TC-007", description: "too long currency code", code: "USDD" },
];

const negativeInvalidCodes = [
  { id: "TC-008", description: "lowercase currency code", code: "usd" },
  { id: "TC-009", description: "mixed case currency code", code: "Usd" },
  { id: "TC-010", description: "currency code with digit", code: "U5D" },
  { id: "TC-011", description: "non-Latin currency code", code: "ÄÖÜ" },
];

test.describe("GET /api/currencies", () => {
  test.describe("Positive", () => {
    test("TC-001 returns seed currencies", async ({ request }) => {
      const response = await request.get("/api/currencies");
      expect(response.status()).toBe(StatusCodes.OK);

      const body: { currency: string; rate: number }[] = await response.json();
      const codes = body.map((item) => item.currency);
      for (const seedCurrency of SEED_CURRENCIES) {
        expect(codes).toContain(seedCurrency);
      }
    });

    test("TC-002 returns currencies sorted by code", async ({ request }) => {
      const response = await request.get("/api/currencies");
      const body: { currency: string }[] = await response.json();
      const codes = body.map((item) => item.currency);

      expect(codes).toEqual([...codes].sort());
    });
  });
});

test.describe("GET /api/rates/{currency}", () => {
  test.describe("Positive", () => {
    for (const { id, currency } of existingCurrencies) {
      test(`${id} returns rate for existing currency ${currency}`, async ({
        request,
      }) => {
        const response = await request.get(`/api/rates/${currency}`);
        expect(response.status()).toBe(StatusCodes.OK);

        const body = await response.json();
        expect(body.currency).toBe(currency);
        expect(typeof body.rate).toBe("number");
        expect(body.rate).toBeGreaterThan(0);
        expect(body.rate).toBeLessThanOrEqual(maxRate);
      });
    }
  });

  test.describe("Boundary", () => {
    for (const { id, description, code } of boundaryInvalidCodes) {
      test(`${id} returns 400 for ${description}`, async ({ request }) => {
        const response = await request.get(`/api/rates/${code}`);
        expect(response.status()).toBe(StatusCodes.BAD_REQUEST);
        expect(await response.json()).toHaveProperty("error");
      });
    }
  });

  test.describe("Negative", () => {
    for (const { id, description, code } of negativeInvalidCodes) {
      test(`${id} returns 400 for ${description}`, async ({ request }) => {
        const response = await request.get(`/api/rates/${code}`);
        expect(response.status()).toBe(StatusCodes.BAD_REQUEST);
        expect(await response.json()).toHaveProperty("error");
      });
    }

    test("TC-012 returns 404 for unknown currency", async ({ request }) => {
      const response = await request.get("/api/rates/RRR");
      expect(response.status()).toBe(StatusCodes.NOT_FOUND);
      expect(await response.json()).toHaveProperty("error");
    });
  });
});

test.describe("Other", () => {
  test.describe("Negative", () => {
    test("TC-013 returns 405 for unsupported method", async ({ request }) => {
      const response = await request.put(`/api/rates/${Currency.USD}`, {
        data: { rate: 1.08 },
      });
      expect(response.status()).toBe(StatusCodes.METHOD_NOT_ALLOWED);
      expect(await response.json()).toHaveProperty("error");
    });

    test("TC-014 returns 404 for unknown URL", async ({ request }) => {
      const response = await request.get("/api/unknown");
      expect(response.status()).toBe(StatusCodes.NOT_FOUND);
      expect(await response.json()).toHaveProperty("error");
    });
  });
});
