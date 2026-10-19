# Currency Rates API — Test Cases

Base URL: `https://shop.tl-academy.ee`
API documentation: `https://shop.tl-academy.ee/docs/rates`

Notes:
- The database is shared by everyone and reset every hour. Intermittent failures
  may come from other users changing the same data or from the hourly reset,
  not from API bugs.
- Test case IDs are unique per test file, not globally. In bug reports, always
  name the endpoint together with the ID (for example, `POST TC-012`).

## GET /api/currencies

| ID     | Category | Test case                         | Expected result                                           |
|--------|----------|-----------------------------------|-----------------------------------------------------------|
| TC-001 | Positive | Returns seed currencies           | 200, contains USD, GBP, JPY                               |
| TC-002 | Positive | Returns currencies sorted by code | 200, at least 2 items, ascending order                    |
| TC-015 | Positive | Every currency matches the model  | 200, each item: 3 uppercase letters, 0 < rate ≤ 1,000,000 |

TC-015 can also fail because of invalid data created by anyone through another
endpoint.

## GET /api/rates/{currency}

Precondition (TC-016): before the test, currency `WWW` is deleted (if it exists)
and created (expects 201). It is deleted after the test.

| ID     | Category | Test case                              | Expected result                              |
|--------|----------|----------------------------------------|----------------------------------------------|
| TC-003 | Positive | Existing currency `USD`                | 200, matches the model, currency is USD      |
| TC-004 | Positive | Existing currency `GBP`                | 200, matches the model, currency is GBP      |
| TC-005 | Positive | Existing currency `JPY`                | 200, matches the model, currency is JPY      |
| TC-016 | Positive | Created currency `WWW`                 | 200, exact body `{currency: WWW, rate: 2.5}` |
| TC-006 | Boundary | Too short code `US`                    | 400                                          |
| TC-007 | Boundary | Too long code `USDD`                   | 400                                          |
| TC-008 | Negative | Lowercase code `usd`                   | 400                                          |
| TC-009 | Negative | Mixed case code `Usd`                  | 400                                          |
| TC-010 | Negative | Code with digit `U5D`                  | 400                                          |
| TC-011 | Negative | Non-Latin code `ÄÖÜ`                   | 400                                          |
| TC-012 | Negative | Unknown currency `RRR` (deleted first) | 404                                          |

## Other

| ID     | Category | Test case                               | Expected result |
|--------|----------|-----------------------------------------|-----------------|
| TC-013 | Negative | Unsupported method `PUT /api/rates/USD` | 405             |
| TC-014 | Negative | Unknown URL `/api/unknown`              | 404             |

## POST /api/rates

Precondition (all tests): before each test, currency `XXX` is deleted (if it
exists). It is deleted again after each test, even if the test failed.

After every 400 and 413, `GET /api/currencies` confirms that neither the sent
code nor `XXX` was created (this also catches the API normalizing an invalid
code such as `xxx` to `XXX` instead of rejecting it).

| ID     | Category | Test case                                                              | Expected result               |
|--------|----------|------------------------------------------------------------------------|-------------------------------|
| TC-001 | Positive | Create currency `XXX` with rate 0.95                                   | 201, returns created currency |
| TC-022 | Positive | Created currency is persisted (GET after POST)                         | 200, rate 0.95                |
| TC-014 | Boundary | Very small positive rate `0.000001`                                    | 201, returns created currency |
| TC-015 | Boundary | Maximum rate `1000000`                                                 | 201, returns created currency |
| TC-002 | Boundary | Rate `0`                                                               | 400, not created              |
| TC-003 | Boundary | Rate `1000000.01`                                                      | 400, not created              |
| TC-004 | Negative | Too short code `XX`                                                    | 400, not created              |
| TC-005 | Negative | Lowercase code `xxx`                                                   | 400, not created              |
| TC-006 | Negative | Negative rate `-1`                                                     | 400, not created              |
| TC-007 | Negative | Non-numeric rate `'RU'`                                                | 400, not created              |
| TC-008 | Negative | Numeric string rate `'0.95'`                                           | 400, not created              |
| TC-009 | Negative | Null rate                                                              | 400, not created              |
| TC-010 | Negative | Missing rate                                                           | 400, not created              |
| TC-016 | Negative | Too long code `XXXX`                                                   | 400, not created              |
| TC-017 | Negative | Non-Latin code `ÄXX`                                                   | 400, not created              |
| TC-018 | Negative | Code with digit `XX1`                                                  | 400, not created              |
| TC-019 | Negative | Mixed case code `Xxx`                                                  | 400, not created              |
| TC-020 | Negative | Missing currency                                                       | 400, not created              |
| TC-021 | Negative | Numeric currency `123`                                                 | 400, not created              |
| TC-011 | Negative | Invalid JSON                                                           | 400, not created              |
| TC-012 | Negative | Currency already exists (`XXX` created first, then POST with rate 1.5) | 409, rate stays 0.95          |
| TC-013 | Negative | Body larger than 10,000 bytes                                          | 413, not created              |

## PATCH /api/rates/{currency}

Precondition (TC-001 to TC-012, TC-020, TC-021): before each test, currency `YYY`
is deleted (if it exists) and created (expects 201). It is deleted
after each test. TC-013 to TC-019 need no test data.

After every 400 and 413 on `YYY`, a GET confirms the rate is still 0.95.

Invalid codes are based on `YYY`, never on real currencies: if the API normalized
a code instead of rejecting it, it must not update shared data.

| ID     | Category    | Test case                                   | Expected result                                   |
|--------|-------------|---------------------------------------------|---------------------------------------------------|
| TC-001 | Positive    | Update rate to 1.1                          | 200, returns updated currency                     |
| TC-002 | Positive    | Updated rate is persisted (GET after PATCH) | 200, rate 1.1                                     |
| TC-003 | Boundary    | Very small positive rate `0.000001`         | 200, returns updated currency                     |
| TC-004 | Boundary    | Maximum rate `1000000`                      | 200, returns updated currency                     |
| TC-005 | Boundary    | Rate `0`                                    | 400, rate unchanged                               |
| TC-006 | Boundary    | Rate `1000000.01`                           | 400, rate unchanged                               |
| TC-007 | Negative    | Negative rate `-1`                          | 400, rate unchanged                               |
| TC-008 | Negative    | Non-numeric rate `'RU'`                     | 400, rate unchanged                               |
| TC-009 | Negative    | Numeric string rate `'1.10'`                | 400, rate unchanged                               |
| TC-010 | Negative    | Null rate                                   | 400, rate unchanged                               |
| TC-011 | Negative    | Missing rate `{}`                           | 400, rate unchanged                               |
| TC-012 | Negative    | Invalid JSON                                | 400, rate unchanged                               |
| TC-013 | Negative    | Lowercase code `yyy`                        | 400                                               |
| TC-014 | Negative    | Too short code `YY`                         | 400                                               |
| TC-015 | Negative    | Too long code `YYYY`                        | 400                                               |
| TC-016 | Negative    | Unknown currency `RRR` (deleted first)      | 404                                               |
| TC-017 | Negative    | Non-Latin code `ÜYY`                        | 400                                               |
| TC-018 | Negative    | Code with digit `YY1`                       | 400                                               |
| TC-019 | Negative    | Mixed case code `Yyy`                       | 400                                               |
| TC-020 | Negative    | Body larger than 10,000 bytes               | 413, rate unchanged                               |
| TC-021 | Exploratory | Body with `currency: "ZZZ"`                 | 200 or 400; `YYY` still exists, `ZZZ` not created |
