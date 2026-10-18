import { test, expect } from "@playwright/test";
import { StatusCodes } from "http-status-codes";
import { Currency, SEED_CURRENCIES } from "./currency";

test.beforeAll(async ({ request }) => {
  const response = await request.get("/api/currencies");
  const currencies: { currency: string }[] = await response.json();

  for (const { currency } of currencies) {
    if (!SEED_CURRENCIES.includes(currency)) {
      const deleted = await request.delete(`/api/rates/${currency}`);
      expect(deleted.status()).toBe(StatusCodes.NO_CONTENT);
    }
  }
});

test.describe("GET /api/currencies", () => {
  test("returns 3 currencies", async ({ request }) => {
    const response = await request.get("/api/currencies");

    expect(response.status()).toBe(StatusCodes.OK);

    const body = await response.json();
    expect(body).toHaveLength(3);
  });
});

test.describe("GET /api/rates/{currency}", () => {
  test("returns rate for USD existing currency", async ({ request }) => {
    const response = await request.get(`/api/rates/${Currency.USD}`);

    expect(response.status()).toBe(StatusCodes.OK);

    const body = await response.json();
    expect(body.currency).toBe(Currency.USD);
    expect(typeof body.rate).toBe("number");
    expect(body.rate).toBeGreaterThan(0);
  });

  test("returns rate for GBP existing currency", async ({ request }) => {
    const response = await request.get(`/api/rates/${Currency.GBP}`);

    expect(response.status()).toBe(StatusCodes.OK);

    const body = await response.json();
    expect(body.currency).toBe(Currency.GBP);
    expect(typeof body.rate).toBe("number");
    expect(body.rate).toBeGreaterThan(0);
    expect(body.rate).toBeLessThan(1000000);
  });

  test("returns 400 for lowercase currency code", async ({ request }) => {
    const response = await request.get("/api/rates/usd");

    expect(response.status()).toBe(StatusCodes.BAD_REQUEST);
  });

  test("returns 400 for too short currency code", async ({ request }) => {
    const response = await request.get("/api/rates/US");

    expect(response.status()).toBe(StatusCodes.BAD_REQUEST);
  });

  test("returns 404 for unknown currency", async ({ request }) => {
    const response = await request.get("/api/rates/RRR");

    expect(response.status()).toBe(StatusCodes.NOT_FOUND);
  });
});

test.describe("Other", () => {
  test("returns 405 for unsupported method", async ({ request }) => {
    const response = await request.put(`/api/rates/${Currency.USD}`, {
      data: { rate: 1.08 },
    });

    expect(response.status()).toBe(StatusCodes.METHOD_NOT_ALLOWED);
    expect(await response.json()).toHaveProperty("error");
  });

  test("returns 404 for unknown URL", async ({ request }) => {
    const response = await request.get("/api/unknown");

    expect(response.status()).toBe(StatusCodes.NOT_FOUND);
    expect(await response.json()).toHaveProperty("error");
  });
});
