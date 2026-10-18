import { expect, test } from '@playwright/test'
import { StatusCodes } from 'http-status-codes'

const testCurrency = 'YYY'
const initialRate = 0.95

const validBoundaryRates = [
    { id: 'TC-003', description: 'minimum positive rate', rate: 0.000001 },
    { id: 'TC-004', description: 'maximum rate 1000000', rate: 1000000 },
]

const invalidBoundaryBodies = [
    { id: 'TC-005', description: 'rate equal to 0', body: { rate: 0 } },
    { id: 'TC-006', description: 'rate greater than 1000000', body: { rate: 1000000.01 } },
]

const negativeInvalidBodies = [
    { id: 'TC-007', description: 'negative rate', body: { rate: -1 } },
    { id: 'TC-008', description: 'non-numeric rate', body: { rate: 'RU' } },
    { id: 'TC-009', description: 'numeric string rate', body: { rate: '1.10' } },
    { id: 'TC-010', description: 'null rate', body: { rate: null } },
    { id: 'TC-011', description: 'missing rate', body: {} },
]

const invalidCodes = [
    { id: 'TC-013', description: 'lowercase currency code', code: 'yyy' },
    { id: 'TC-014', description: 'too short currency code', code: 'YY' },
    { id: 'TC-015', description: 'too long currency code', code: 'YYYY' },
]

test.describe('PATCH /api/rates/{currency}', () => {
    test.beforeEach(async ({ request }) => {
        await request.post('/api/rates', {
            data: { currency: testCurrency, rate: initialRate },
        })
    })

    test.afterEach(async ({ request }) => {
        await request.delete(`/api/rates/${testCurrency}`)
    })

    test.describe('Positive', () => {
        test('TC-001 updates rate of existing currency', async ({ request }) => {
            const response = await request.patch(`/api/rates/${testCurrency}`, {
                data: { rate: 1.1 },
            })
            expect(response.status()).toBe(StatusCodes.OK)
            expect(await response.json()).toEqual({ currency: testCurrency, rate: 1.1 })
        })

        test('TC-002 updated rate is persisted', async ({ request }) => {
            await request.patch(`/api/rates/${testCurrency}`, {
                data: { rate: 1.1 },
            })

            const response = await request.get(`/api/rates/${testCurrency}`)
            expect(response.status()).toBe(StatusCodes.OK)
            expect(await response.json()).toEqual({ currency: testCurrency, rate: 1.1 })
        })
    })

    test.describe('Boundary', () => {
        for (const { id, description, rate } of validBoundaryRates) {
            test(`${id} accepts ${description}`, async ({ request }) => {
                const response = await request.patch(`/api/rates/${testCurrency}`, {
                    data: { rate },
                })
                expect(response.status()).toBe(StatusCodes.OK)
                expect(await response.json()).toEqual({ currency: testCurrency, rate })
            })
        }

        for (const { id, description, body } of invalidBoundaryBodies) {
            test(`${id} returns 400 for ${description}`, async ({ request }) => {
                const response = await request.patch(`/api/rates/${testCurrency}`, {
                    data: body,
                })
                expect(response.status()).toBe(StatusCodes.BAD_REQUEST)
                expect(await response.json()).toHaveProperty('error')
            })
        }
    })

    test.describe('Negative', () => {
        for (const { id, description, body } of negativeInvalidBodies) {
            test(`${id} returns 400 for ${description}`, async ({ request }) => {
                const response = await request.patch(`/api/rates/${testCurrency}`, {
                    data: body,
                })
                expect(response.status()).toBe(StatusCodes.BAD_REQUEST)
                expect(await response.json()).toHaveProperty('error')
            })
        }

        test('TC-012 returns 400 for invalid JSON', async ({ request }) => {
            const response = await request.patch(`/api/rates/${testCurrency}`, {
                data: '{"rate": ',
                headers: { 'Content-Type': 'application/json' },
            })
            expect(response.status()).toBe(StatusCodes.BAD_REQUEST)
            expect(await response.json()).toHaveProperty('error')
        })

        for (const { id, description, code } of invalidCodes) {
            test(`${id} returns 400 for ${description}`, async ({ request }) => {
                const response = await request.patch(`/api/rates/${code}`, {
                    data: { rate: 1.1 },
                })
                expect(response.status()).toBe(StatusCodes.BAD_REQUEST)
                expect(await response.json()).toHaveProperty('error')
            })
        }

        test('TC-016 returns 404 for unknown currency', async ({ request }) => {
            // precondition: make sure RRR does not exist (shared database)
            await request.delete('/api/rates/RRR')

            const response = await request.patch('/api/rates/RRR', {
                data: { rate: 1.1 },
            })
            expect(response.status()).toBe(StatusCodes.NOT_FOUND)
            expect(await response.json()).toHaveProperty('error')
        })
    })
})