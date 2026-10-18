# Currency Rates API — Test Cases

Base URL: `https://shop.tl-academy.ee`

Notes:
- The database is shared and reset every hour. Tests do not modify seed currencies (USD, GBP, JPY).
- Every error response is expected to have the format `{"error": "message"}`.
- TC cases are valid for V2 TESTS

## GET /api/currencies

| ID | Category | Test case | Expected result |
|---|---|---|---|
| TC-001 | Positive | Returns seed currencies | 200, contains USD, GBP, JPY |
| TC-002 | Positive | Returns currencies sorted by code | 200, ascending order |

## GET /api/rates/{currency}

| ID | Category | Test case | Expected result |
|---|---|---|---|
| TC-003 | Positive | Existing currency `USD` | 200, rate > 0 and ≤ 1,000,000 |
| TC-004 | Positive | Existing currency `GBP` | 200, rate > 0 and ≤ 1,000,000 |
| TC-005 | Positive | Existing currency `JPY` | 200, rate > 0 and ≤ 1,000,000 |
| TC-006 | Boundary | Too short code `US` | 400 |
| TC-007 | Boundary | Too long code `USDD` | 400 |
| TC-008 | Negative | Lowercase code `usd` | 400 |
| TC-009 | Negative | Mixed case code `Usd` | 400 |
| TC-010 | Negative | Code with digit `U5D` | 400 |
| TC-011 | Negative | Non-Latin code `ÄÖÜ` | 400 |
| TC-012 | Negative | Unknown currency `RRR` | 404 |

## Other

| ID | Category | Test case | Expected result |
|---|---|---|---|
| TC-013 | Negative | Unsupported method `PUT /api/rates/USD` | 405 |
| TC-014 | Negative | Unknown URL `/api/unknown` | 404 |

## POST /api/rates

| ID | Category | Test case | Expected result |
|---|---|---|---|
| TC-001 | Positive | Create currency `XXX` with rate 0.95 | 201, returns created currency |
| TC-002 | Boundary | Rate `0` | 400 |
| TC-003 | Boundary | Rate `1000000.01` | 400 |
| TC-004 | Negative | Too short code `XX` | 400 |
| TC-005 | Negative | Lowercase code `chf` | 400 |
| TC-006 | Negative | Negative rate `-1` | 400 |
| TC-007 | Negative | Non-numeric rate `'RU'` | 400 |
| TC-008 | Negative | Numeric string rate `'0.95'` | 400 |
| TC-009 | Negative | Null rate | 400 |
| TC-010 | Negative | Missing rate | 400 |
| TC-011 | Negative | Invalid JSON | 400 |
| TC-012 | Negative | Currency already exists `USD` | 409 |
| TC-013 | Negative | Body larger than 10,000 bytes | 413 |

## PATCH /api/rates/{currency}

Precondition: currency `YYY` (rate 0.95) is created before each test and deleted after it.

| ID | Category | Test case | Expected result |
|---|---|---|---|
| TC-001 | Positive | Update rate to 1.1 | 200, returns updated currency |
| TC-002 | Positive | Updated rate is persisted (GET after PATCH) | 200, rate 1.1 |
| TC-003 | Boundary | Rate `0.000001` | 200 |
| TC-004 | Boundary | Rate `1000000` | 200 |
| TC-005 | Boundary | Rate `0` | 400 |
| TC-006 | Boundary | Rate `1000000.01` | 400 |
| TC-007 | Negative | Negative rate `-1` | 400 |
| TC-008 | Negative | Non-numeric rate `'RU'` | 400 |
| TC-009 | Negative | Numeric string rate `'1.10'` | 400 |
| TC-010 | Negative | Null rate | 400 |
| TC-011 | Negative | Missing rate `{}` | 400 |
| TC-012 | Negative | Invalid JSON | 400 |
| TC-013 | Negative | Lowercase code `yyy` | 400 |
| TC-014 | Negative | Too short code `YY` | 400 |
| TC-015 | Negative | Too long code `YYYY` | 400 |
| TC-016 | Negative | Unknown currency `RRR` | 404 |