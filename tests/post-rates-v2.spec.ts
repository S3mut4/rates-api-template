import { APIRequestContext, APIResponse, expect, test } from "@playwright/test";
import { StatusCodes } from "http-status-codes";

const testCurrency = "XXX";
const validRate = 0.95;
const duplicateRate = 1.5;
const maxBodyBytes = 10_000;

const validBoundaryRates = [
  { id: "TC-014", description: "very small positive rate", rate: 0.000001 },
  { id: "TC-015", description: "maximum rate 1000000", rate: 1000000 },
];

const invalidBodies: {
  id: string;
  category: string;
  description: string;
  body: Record<string, unknown>;
}[] = [
  {
    id: "TC-002",
    category: "Boundary",
    description: "rate equal to 0",
    body: { currency: testCurrency, rate: 0 },
  },
  {
    id: "TC-003",
    category: "Boundary",
    description: "rate greater than 1000000",
    body: { currency: testCurrency, rate: 1000000.01 },
  },
  {
    id: "TC-004",
    category: "Negative",
    description: "too short currency code",
    body: { currency: "XX", rate: validRate },
  },
  {
    id: "TC-005",
    category: "Negative",
    description: "lowercase currency code",
    body: { currency: "xxx", rate: validRate },
  },
  {
    id: "TC-006",
    category: "Negative",
    description: "negative rate",
    body: { currency: testCurrency, rate: -1 },
  },
  {
    id: "TC-007",
    category: "Negative",
    description: "non-numeric rate",
    body: { currency: testCurrency, rate: "RU" },
  },
  {
    id: "TC-008",
    category: "Negative",
    description: "numeric string rate",
    body: { currency: testCurrency, rate: "0.95" },
  },
  {
    id: "TC-009",
    category: "Negative",
    description: "null rate",
    body: { currency: testCurrency, rate: null },
  },
  {
    id: "TC-010",
    category: "Negative",
    description: "missing rate",
    body: { currency: testCurrency },
  },
  {
    id: "TC-016",
    category: "Negative",
    description: "too long currency code",
    body: { currency: "XXXX", rate: validRate },
  },
  {
    id: "TC-017",
    category: "Negative",
    description: "non-Latin currency code",
    body: { currency: "ÄXX", rate: validRate },
  },
  {
    id: "TC-018",
    category: "Negative",
    description: "currency code with digit",
    body: { currency: "XX1", rate: validRate },
  },
  {
    id: "TC-019",
    category: "Negative",
    description: "mixed case currency code",
    body: { currency: "Xxx", rate: validRate },
  },
  {
    id: "TC-020",
    category: "Negative",
    description: "missing currency",
    body: { rate: validRate },
  },
  {
    id: "TC-021",
    category: "Negative",
    description: "numeric currency",
    body: { currency: 123, rate: validRate },
  },
];

// spec: all errors come as {"error": "message"}
async function expectErrorResponse(response: APIResponse, status: number) {
  expect(response.status()).toBe(status);
  expect(await response.json()).toEqual({ error: expect.any(String) });
}

// checks the list, so it also works for codes that GET /api/rates/{code}
// would reject with 400. Also checks testCurrency, in case the API
// normalizes an invalid code (e.g. "xxx" -> "XXX") instead of rejecting it
async function expectCurrencyNotCreated(
  request: APIRequestContext,
  currency: unknown,
) {
  const response = await request.get("/api/currencies");
  expect(response.status()).toBe(StatusCodes.OK);
  const currencies: { currency: string }[] = await response.json();
  const codes = currencies.map((item) => item.currency);
  expect(codes).not.toContain(String(currency));
  expect(codes).not.toContain(testCurrency);
}

test.describe("POST /api/rates", () => {
  // all tests share the same currency: run them in order in one worker,
  // even if fullyParallel is enabled in playwright.config.ts
  test.describe.configure({ mode: "default" });

  // shared database: make sure the test currency does not exist before
  // each test, and remove it afterwards even if the test failed
  test.beforeEach(async ({ request }) => {
    await request.delete(`/api/rates/${testCurrency}`);
  });

  test.afterEach(async ({ request }) => {
    await request.delete(`/api/rates/${testCurrency}`);
  });

  test.describe("Positive", () => {
    test("TC-001 creates new currency and returns 201", async ({ request }) => {
      const response = await request.post("/api/rates", {
        data: { currency: testCurrency, rate: validRate },
      });
      expect(response.status()).toBe(StatusCodes.CREATED);
      expect(await response.json()).toEqual({
        currency: testCurrency,
        rate: validRate,
      });
    });

    test("TC-022 created currency is persisted", async ({ request }) => {
      const postResponse = await request.post("/api/rates", {
        data: { currency: testCurrency, rate: validRate },
      });
      expect(postResponse.status()).toBe(StatusCodes.CREATED);

      const getResponse = await request.get(`/api/rates/${testCurrency}`);
      expect(getResponse.status()).toBe(StatusCodes.OK);
      expect(await getResponse.json()).toEqual({
        currency: testCurrency,
        rate: validRate,
      });
    });
  });

  test.describe("Boundary", () => {
    for (const { id, description, rate } of validBoundaryRates) {
      test(`${id} accepts ${description}`, async ({ request }) => {
        const response = await request.post("/api/rates", {
          data: { currency: testCurrency, rate },
        });
        expect(response.status()).toBe(StatusCodes.CREATED);
        expect(await response.json()).toEqual({
          currency: testCurrency,
          rate,
        });
      });
    }
  });

  test.describe("Invalid body", () => {
    for (const { id, category, description, body } of invalidBodies) {
      test(`${id} [${category}] returns 400 for ${description}`, async ({
        request,
      }) => {
        const response = await request.post("/api/rates", { data: body });
        await expectErrorResponse(response, StatusCodes.BAD_REQUEST);
        await expectCurrencyNotCreated(request, body.currency);
      });
    }
  });

  test.describe("Negative", () => {
    test("TC-011 returns 400 for invalid JSON", async ({ request }) => {
      const response = await request.post("/api/rates", {
        data: `{"currency": "${testCurrency}",`,
        headers: { "Content-Type": "application/json" },
      });
      await expectErrorResponse(response, StatusCodes.BAD_REQUEST);
      await expectCurrencyNotCreated(request, testCurrency);
    });

    test("TC-012 returns 409 when currency already exists", async ({
      request,
    }) => {
      const firstResponse = await request.post("/api/rates", {
        data: { currency: testCurrency, rate: validRate },
      });
      expect(firstResponse.status()).toBe(StatusCodes.CREATED);

      const response = await request.post("/api/rates", {
        data: { currency: testCurrency, rate: duplicateRate },
      });
      await expectErrorResponse(response, StatusCodes.CONFLICT);

      // the existing currency must not be overwritten
      const getResponse = await request.get(`/api/rates/${testCurrency}`);
      expect(getResponse.status()).toBe(StatusCodes.OK);
      expect(await getResponse.json()).toEqual({
        currency: testCurrency,
        rate: validRate,
      });
    });

    test("TC-013 returns 413 for body larger than 10000 bytes", async ({
      request,
    }) => {
      const response = await request.post("/api/rates", {
        data: {
          currency: testCurrency,
          rate: validRate,
          padding: "x".repeat(maxBodyBytes + 1),
        },
      });
      await expectErrorResponse(response, StatusCodes.REQUEST_TOO_LONG);
      await expectCurrencyNotCreated(request, testCurrency);
    });
  });
});
