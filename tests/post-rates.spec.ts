import {expect, test} from '@playwright/test';

test.describe('POST /api/rates', () => {
  test('creates new currency and returns 201', async ({ request } ) => {
    const response = await request.post ( `/api/rates`, {
      data: { "currency": "CHF", "rate": 0.95}
    });
    expect(response.status()).toBe(201);
    const responseDelete = await request.delete ( `/api/rates/CHF`)
    expect(responseDelete.status()).toBe(204);
  });
  test('returns 400 for invalid currency code', async ({ request }) => {
    const response = await request.post ( `/api/rates`, {
      data: { "currency": "XX", "rate": 0.95}
    });
    expect(response.status()).toBe(400);
  });
  test('returns 400 for rate equal to 0', async ({ request }) => {
    const response = await request.post ( `/api/rates`, {
      data: { "currency": "XXX", "rate": 0}
    });
    expect(response.status()).toBe(400);
  });
  test('returns 400 for rate greater than 1000000', async ({ request }) => {
    const response = await request.post ( `/api/rates`, {
      data: { "currency": "XXX", "rate": 1000001 }
    });
    expect(response.status()).toBe(400);
  });
  test('returns 400 for non-numeric rate', async ({ request }) => {
    const response = await request.post ( `/api/rates`, {
      data: { "currency": "XXX", "rate": "RU"}
    });
    expect(response.status()).toBe(400);
  });
  test('returns 400 for invalid JSON', async ({ request }) => {
    const response = await request.post ( `/api/rates`, {
      data: { "currency": "XXX"}
    });
    expect(response.status()).toBe(400);
  });
  test('returns 409 when currency already exists', async ({ request }) => {
    const response = await request.post ( `/api/rates`, {
      data: { "currency": "USD", "rate": 1.08}
    });
    expect(response.status()).toBe(409);
  });
  test('returns 413 for body larger than 10000 bytes', async ({ request }) => {
    const response = await request.post ( `/api/rates`, {
      data: { currency: 'CHF', rate: 0.95, padding: 'a'.repeat(10001) }
    });
    expect(response.status()).toBe(413);
  });

});