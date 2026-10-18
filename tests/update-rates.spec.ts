import { expect, test } from '@playwright/test'
import { StatusCodes } from 'http-status-codes'

test.describe('PATCH /api/rates/{currency}', () => {
  test.beforeEach(async ({ request }) => {
    await request.post('/api/rates', {
      data: { currency: 'YYY', rate: 0.95 },
    })
  })

  test.afterEach(async ({ request }) => {
    await request.delete('/api/rates/YYY')
  })

  test('updates rate of existing currency', async ({ request }) => {
    const response = await request.patch('/api/rates/YYY', {
      data: { rate: 1.1 },
    })
    expect(response.status()).toBe(StatusCodes.OK)
    expect(await response.json()).toEqual({ currency: 'YYY', rate: 1.1 })
  })

  test('returns 400 for invalid rate', async ({ request }) => {
    const response = await request.patch('/api/rates/YYY', {
      data: { rate: 0 },
    })
    expect(response.status()).toBe(StatusCodes.BAD_REQUEST)
  })

  test('returns 400 for invalid currency code', async ({ request }) => {
    const response = await request.patch('/api/rates/yyy', {
      data: { rate: 1.1 },
    })
    expect(response.status()).toBe(StatusCodes.BAD_REQUEST)
  })

  test('returns 404 for unknown currency', async ({ request }) => {
    await request.delete('/api/rates/RRR')

    const response = await request.patch('/api/rates/RRR', {
      data: { rate: 1.1 },
    })
    expect(response.status()).toBe(StatusCodes.NOT_FOUND)
  })
})