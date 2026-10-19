import { APIResponse, expect, test } from "@playwright/test";
import { StatusCodes } from "http-status-codes";
import { Currency, SEED_CURRENCIES } from "./currency";

type CurrencyRate = { currency: string; rate: number };

const maxRate = 1000000;
const currencyCodePattern = /^[A-Z]{3}$/;
const testCurrency = "WWW";
const testRate = 2.5;
const unknownCurrency = "RRR";

const existingCurrencies = [
  { id: "TC-003", currency: Currency.USD },
  { id: "TC-004", currency: Currency.GBP },
  { id: "TC-005", currency: Currency.JPY },
];

const invalidCodes = [
  {
    id: "TC-006",
    category: "Boundary",
    description: "too short currency code",
    code: "US",
  },
  {
    id: "TC-007",
    category: "Boundary",
    description: "too long currency code",
    code: "USDD",
  },
  {
    id: "TC-008",
    category: "Negative",
    description: "lowercase currency code",
    code: "usd",
  },
  {
    id: "TC-009",
    category: "Negative",
    description: "mixed case currency code",
    code: "Usd",
  },
  {
    id: "TC-010",
    category: "Negative",
    description: "currency code with digit",
    code: "U5D",
  },
  {
    id: "TC-011",
    category: "Negative",
    description: "non-Latin currency code",
    code: "ÄÖÜ",
  },
];

// spec: all errors come as {"error": "message"}
async function expectErrorResponse(response: APIResponse, status: number) {
  expect(response.status()).toBe(status);
  expect(await response.json()).toEqual({ error: expect.any(String) });
}

// spec, section 2: currency model
function expectValidCurrency(item: CurrencyRate) {
  expect(item).toEqual({
    currency: expect.any(String),
    rate: expect.any(Number),
  });
  expect(item.currency).toMatch(currencyCodePattern);
  expect(item.rate).toBeGreaterThan(0);
  expect(item.rate).toBeLessThanOrEqual(maxRate);
}

test.describe("GET /api/currencies", () => {
  test.describe("Positive", () => {
    test("TC-001 returns seed currencies", async ({ request }) => {
      const response = await request.get("/api/currencies");
      expect(response.status()).toBe(StatusCodes.OK);

      const body: CurrencyRate[] = await response.json();
      const codes = body.map((item) => item.currency);
      for (const seedCurrency of SEED_CURRENCIES) {
        expect(codes).toContain(seedCurrency);
      }
    });

    test("TC-002 returns currencies sorted by code", async ({ request }) => {
      const response = await request.get("/api/currencies");
      expect(response.status()).toBe(StatusCodes.OK);

      const body: CurrencyRate[] = await response.json();
      const codes = body.map((item) => item.currency);
      // order can only be checked with at least 2 items
      expect(codes.length).toBeGreaterThan(1);
      expect(codes).toEqual([...codes].sort());
    });

    // shared database: a failure here can also come from invalid data
    // created through another endpoint (by anyone), not only from GET
    test("TC-015 every currency matches the currency model", async ({
      request,
    }) => {
      const response = await request.get("/api/currencies");
      expect(response.status()).toBe(StatusCodes.OK);

      const body: CurrencyRate[] = await response.json();
      for (const item of body) {
        expectValidCurrency(item);
      }
    });
  });
});

test.describe("GET /api/rates/{currency}", () => {
  test.describe("Positive", () => {
    // seed data can be changed or deleted by anyone (shared database,
    // reset every hour): check the model, not the exact rate
    for (const { id, currency } of existingCurrencies) {
      test(`${id} returns rate for existing currency ${currency}`, async ({
        request,
      }) => {
        const response = await request.get(`/api/rates/${currency}`);
        expect(response.status()).toBe(StatusCodes.OK);

        const body: CurrencyRate = await response.json();
        expectValidCurrency(body);
        expect(body.currency).toBe(currency);
      });
    }
  });

  test.describe("with test currency", () => {
    // all tests share the same currency: run them in order in one worker,
    // even if fullyParallel is enabled in playwright.config.ts
    test.describe.configure({ mode: "default" });

    test.beforeEach(async ({ request }) => {
      // shared database: remove leftovers before creating the test currency
      await request.delete(`/api/rates/${testCurrency}`);

      const response = await request.post("/api/rates", {
        data: { currency: testCurrency, rate: testRate },
      });
      expect(response.status()).toBe(StatusCodes.CREATED);
    });

    test.afterEach(async ({ request }) => {
      await request.delete(`/api/rates/${testCurrency}`);
    });

    test("TC-016 returns exact rate of created currency", async ({
      request,
    }) => {
      const response = await request.get(`/api/rates/${testCurrency}`);
      expect(response.status()).toBe(StatusCodes.OK);
      expect(await response.json()).toEqual({
        currency: testCurrency,
        rate: testRate,
      });
    });
  });

  test.describe("Invalid code", () => {
    for (const { id, category, description, code } of invalidCodes) {
      test(`${id} [${category}] returns 400 for ${description}`, async ({
        request,
      }) => {
        const response = await request.get(`/api/rates/${code}`);
        await expectErrorResponse(response, StatusCodes.BAD_REQUEST);
      });
    }
  });

  test.describe("Negative", () => {
    test("TC-012 returns 404 for unknown currency", async ({ request }) => {
      // precondition: make sure the currency does not exist (shared database)
      await request.delete(`/api/rates/${unknownCurrency}`);

      const response = await request.get(`/api/rates/${unknownCurrency}`);
      await expectErrorResponse(response, StatusCodes.NOT_FOUND);
    });
  });
});

test.describe("Other", () => {
  test.describe("Negative", () => {
    // same rate as the seed value: if PUT were wrongly accepted,
    // the shared data would not change
    test("TC-013 returns 405 for unsupported method", async ({ request }) => {
      const response = await request.put(`/api/rates/${Currency.USD}`, {
        data: { rate: 1.08 },
      });
      await expectErrorResponse(response, StatusCodes.METHOD_NOT_ALLOWED);
    });

    test("TC-014 returns 404 for unknown URL", async ({ request }) => {
      const response = await request.get("/api/unknown");
      await expectErrorResponse(response, StatusCodes.NOT_FOUND);
    });
  });
});
