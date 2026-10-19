import { APIRequestContext, APIResponse, expect, test } from "@playwright/test";
import { StatusCodes } from "http-status-codes";

const testCurrency = "YYY";
const unknownCurrency = "RRR";
const initialRate = 0.95;
const updatedRate = 1.1;
const maxBodyBytes = 10_000;

const validBoundaryRates = [
  { id: "TC-003", description: "very small positive rate", rate: 0.000001 },
  { id: "TC-004", description: "maximum rate 1000000", rate: 1000000 },
];

const invalidBoundaryBodies = [
  { id: "TC-005", description: "rate equal to 0", body: { rate: 0 } },
  {
    id: "TC-006",
    description: "rate greater than 1000000",
    body: { rate: 1000000.01 },
  },
];

const negativeInvalidBodies = [
  { id: "TC-007", description: "negative rate", body: { rate: -1 } },
  { id: "TC-008", description: "non-numeric rate", body: { rate: "RU" } },
  { id: "TC-009", description: "numeric string rate", body: { rate: "1.10" } },
  { id: "TC-010", description: "null rate", body: { rate: null } },
  { id: "TC-011", description: "missing rate", body: {} },
];

const invalidCodes = [
  { id: "TC-013", description: "lowercase currency code", code: "yyy" },
  { id: "TC-014", description: "too short currency code", code: "YY" },
  { id: "TC-015", description: "too long currency code", code: "YYYY" },
  { id: "TC-017", description: "non-Latin currency code", code: "ÜSD" },
  { id: "TC-018", description: "currency code with digit", code: "US1" },
  { id: "TC-019", description: "mixed case currency code", code: "Usd" },
];

// spec: all errors come as {"error": "message"}
async function expectErrorResponse(response: APIResponse, status: number) {
  expect(response.status()).toBe(status);
  expect(await response.json()).toEqual({ error: expect.any(String) });
}

async function expectRateUnchanged(request: APIRequestContext) {
  const response = await request.get(`/api/rates/${testCurrency}`);
  expect(response.status()).toBe(StatusCodes.OK);
  expect(await response.json()).toEqual({
    currency: testCurrency,
    rate: initialRate,
  });
}

test.describe("PATCH /api/rates/{currency}", () => {
  // all tests share the same currency: run them in order in one worker,
  // even if fullyParallel is enabled in playwright.config.ts
  test.describe.configure({ mode: "default" });

  test.describe("with existing currency", () => {
    test.beforeEach(async ({ request }) => {
      // shared database: remove leftovers before creating the test currency
      await request.delete(`/api/rates/${testCurrency}`);

      const response = await request.post("/api/rates", {
        data: { currency: testCurrency, rate: initialRate },
      });
      expect(response.status()).toBe(StatusCodes.CREATED);
    });

    test.afterEach(async ({ request }) => {
      await request.delete(`/api/rates/${testCurrency}`);
    });

    test.describe("Positive", () => {
      test("TC-001 updates rate of existing currency", async ({ request }) => {
        const response = await request.patch(`/api/rates/${testCurrency}`, {
          data: { rate: updatedRate },
        });
        expect(response.status()).toBe(StatusCodes.OK);
        expect(await response.json()).toEqual({
          currency: testCurrency,
          rate: updatedRate,
        });
      });

      test("TC-002 updated rate is persisted", async ({ request }) => {
        const patchResponse = await request.patch(
          `/api/rates/${testCurrency}`,
          { data: { rate: updatedRate } },
        );
        expect(patchResponse.status()).toBe(StatusCodes.OK);

        const getResponse = await request.get(`/api/rates/${testCurrency}`);
        expect(getResponse.status()).toBe(StatusCodes.OK);
        expect(await getResponse.json()).toEqual({
          currency: testCurrency,
          rate: updatedRate,
        });
      });
    });

    test.describe("Boundary", () => {
      for (const { id, description, rate } of validBoundaryRates) {
        test(`${id} accepts ${description}`, async ({ request }) => {
          const response = await request.patch(`/api/rates/${testCurrency}`, {
            data: { rate },
          });
          expect(response.status()).toBe(StatusCodes.OK);
          expect(await response.json()).toEqual({
            currency: testCurrency,
            rate,
          });
        });
      }

      for (const { id, description, body } of invalidBoundaryBodies) {
        test(`${id} returns 400 for ${description}`, async ({ request }) => {
          const response = await request.patch(`/api/rates/${testCurrency}`, {
            data: body,
          });
          await expectErrorResponse(response, StatusCodes.BAD_REQUEST);
          await expectRateUnchanged(request);
        });
      }
    });

    test.describe("Negative", () => {
      for (const { id, description, body } of negativeInvalidBodies) {
        test(`${id} returns 400 for ${description}`, async ({ request }) => {
          const response = await request.patch(`/api/rates/${testCurrency}`, {
            data: body,
          });
          await expectErrorResponse(response, StatusCodes.BAD_REQUEST);
          await expectRateUnchanged(request);
        });
      }

      test("TC-012 returns 400 for invalid JSON", async ({ request }) => {
        const response = await request.patch(`/api/rates/${testCurrency}`, {
          data: '{"rate": ',
          headers: { "Content-Type": "application/json" },
        });
        await expectErrorResponse(response, StatusCodes.BAD_REQUEST);
        await expectRateUnchanged(request);
      });

      test("TC-020 returns 413 for body larger than 10000 bytes", async ({
        request,
      }) => {
        const oversizedBody = {
          rate: updatedRate,
          padding: "x".repeat(maxBodyBytes + 1),
        };

        const response = await request.patch(`/api/rates/${testCurrency}`, {
          data: oversizedBody,
        });
        await expectErrorResponse(response, StatusCodes.REQUEST_TOO_LONG);
        await expectRateUnchanged(request);
      });
    });
  });

  test.describe("without test data", () => {
    for (const { id, description, code } of invalidCodes) {
      test(`${id} returns 400 for ${description}`, async ({ request }) => {
        const response = await request.patch(`/api/rates/${code}`, {
          data: { rate: updatedRate },
        });
        await expectErrorResponse(response, StatusCodes.BAD_REQUEST);
      });
    }

    test("TC-016 returns 404 for unknown currency", async ({ request }) => {
      // precondition: make sure the currency does not exist (shared database)
      await request.delete(`/api/rates/${unknownCurrency}`);

      const response = await request.patch(`/api/rates/${unknownCurrency}`, {
        data: { rate: updatedRate },
      });
      await expectErrorResponse(response, StatusCodes.NOT_FOUND);
    });
  });
});
