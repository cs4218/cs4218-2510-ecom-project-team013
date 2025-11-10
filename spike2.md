# Spike Test Documentation

## Overview

This directory contains a k6 spike test for the e-commerce API. Spike testing validates system behavior under sudden, dramatic traffic increases to identify breaking points, recovery capabilities, and resource bottlenecks.

---

## API Endpoints Tested

### Public Endpoints (No Authentication)

**Product Endpoints:**

- `GET /api/v1/product/get-product` - Product list
- `GET /api/v1/product/product-list/:page` - Paginated products
- `GET /api/v1/product/product-count` - Total product count
- `GET /api/v1/product/search/:keyword` - Product search
- `POST /api/v1/product/product-filters` - Filter products
- `GET /api/v1/product/get-product/:slug` - Product details
- `GET /api/v1/product/product-photo/:pid` - Product images
- `GET /api/v1/product/related-product/:pid/:cid` - Related products
- `GET /api/v1/product/product-category/:slug` - Products by category

**Category Endpoints:**

- `GET /api/v1/category/get-category` - Category list
- `GET /api/v1/category/single-category/:slug` - Single category

**Authentication Endpoints:**

- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login

### Authenticated Endpoints (Requires Login)

- `GET /api/v1/auth/user-auth` - User authentication verification
- `GET /api/v1/auth/orders` - User order history

### Payment Endpoints (Business Critical)

- `GET /api/v1/product/braintree/token` - Payment token generation
- `POST /api/v1/product/braintree/payment` - Payment processing

---

## File Purpose

### `spike.test.js`

A comprehensive k6 spike test that covers 17 API endpoints across 4 main user flows:

1. **Product Browsing** - List, search, pagination, filters (public)
2. **Product Details** - Detail view, photos, related products (public)
3. **Category Browsing** - Categories and products by category (public)
4. **Authenticated Flow** - User authentication, orders, payment (auto-creation available)

**Key Features:**

- **Auto-Registration** - Automatically creates test users when needed
- **Authentication Coverage** - Tests public auth endpoints (login/register) and authenticated flows
- Dynamic data chaining (uses real product/category IDs)
- Organized into logical groups for better reporting
- Configurable via environment variables
- Validates prerequisites before testing
- Generates detailed JSON results
- Robust error handling for auth/payment failures

---

## Prerequisites

**1. Install k6:**  
Follow the official guide: https://grafana.com/docs/k6/latest/set-up/install-k6/

Verify: `k6 version` (should show v1.3.0+)

**2. Start the API:**

```bash
npm run server
# Should run on http://localhost:6060
```

**3. (Optional) Seed test data:**

```bash
npm run seed
```

---

## Running the Test

### Recommended Workflow

**1. Full Spike Test with Auto-Registration (Recommended)**

```bash
# Run complete test - automatically creates user, tests all 17 endpoints
k6 run spike.test.js -e ENABLE_PAYMENT=true
```

This tests all publicly accessible flows (including user registration and login) and subsequent authenticated flows, such as payment processing.

**2. Public-Only Test (Quick Verification)**

```bash
# Test public endpoints only - no authentication required
k6 run spike.test.js
```

This tests product browsing, search, categories (13 public endpoints)

**3. Manual Authentication (Use Existing Credentials)**

```bash
# Use existing user instead of auto-registration
k6 run spike.test.js \
  -e AUTH_EMAIL=user@example.com \
  -e AUTH_PASSWORD=yourpassword
```

**Full flow with credentials:**

```bash
k6 run spike.test.js \
  -e AUTH_EMAIL=user@example.com \
  -e AUTH_PASSWORD=yourpassword \
  -e ENABLE_PAYMENT=true
```

### Configuration Options

| Variable          | Default                 | Description                    |
| ----------------- | ----------------------- | ------------------------------ |
| `BASE_URL`        | `http://localhost:6060` | API base URL                   |
| `USERS_BASELINE`  | `10`                    | Normal traffic level           |
| `USERS_SPIKE`     | `500`                   | Peak spike level               |
| `USE_MICROBURSTS` | `false`                 | Use microburst pattern instead |
| `AUTH_EMAIL`      | _(empty)_               | User email for auth flows      |
| `AUTH_PASSWORD`   | _(empty)_               | User password for auth flows   |
| `ENABLE_ORDERS`   | `true`                  | Include order testing          |
| `ENABLE_PAYMENT`  | `false`                 | Include payment testing        |

**Example with custom settings:**

```bash
k6 run spike.test.js \
  -e USERS_BASELINE=20 \
  -e USERS_SPIKE=1000 \
  -e USE_MICROBURSTS=true
```

---

## Traffic Profiles

### Primary Spike (Default)

Simulates a single sustained spike (e.g., product launch):

- 2 min baseline (10 users)
- 15 sec rapid spike to 500 users
- 1 min sustain at peak
- 15 sec recovery
- 2 min post-recovery baseline

**Duration:** ~6 minutes

### Microbursts

Simulates multiple rapid spikes (e.g., flash sales):

- Three 5-second spikes with 10-second sustains
- Recovery periods between each burst

**Duration:** ~3 minutes

**Enable:** `-e USE_MICROBURSTS=true`

---

## Understanding Results

### Console Output

The test displays:

- **Setup validation** - API connectivity check, credential validation
- **Auto-registration** - User creation when needed
- **Real-time metrics** - Request rates, errors, latency
- **Group timings** - Performance per user flow
- **Checks** - Success rate per endpoint
- **Thresholds** - Pass/fail against defined SLOs

### Success Criteria

- ✅ Error rate < 2%
- ✅ P95 latency < 1000ms
- ✅ P99 latency < 2000ms
- ✅ Public endpoint checks > 99%
- ✅ Auth endpoint checks > 97%
- ✅ Payment checks > 90% (external service)

### Results File

**`spike_results.json`** - Full test data including:

- All metrics with percentiles
- Per-endpoint latency breakdown
- Check pass/fail details
- Timestamp information

**Parse results:**

```bash
# Error rate
jq '.metrics.http_req_failed.values.rate' spike_results.json

# P95 latency
jq '.metrics.http_req_duration.values["p(95)"]' spike_results.json
```

---

## Troubleshooting

### Cannot connect to API

**Check:**

- API is running: `curl http://localhost:6060`
- Correct port in `npm run server` output
- Use explicit URL: `-e BASE_URL=http://localhost:6060`

### Registration failures

**Check:**

- Email format is valid
- Required fields are provided (name, email, password, phone, address)
- User doesn't already exist (try different email)
- Test manually:
  ```bash
  curl -X POST http://localhost:6060/api/v1/auth/register \
    -H "Content-Type: application/json" \
    -d '{"name":"Test User","email":"test@example.com","password":"TestPass123!","phone":"+1234567890","address":"123 Test St"}'
  ```

### Login failures

**Check:**

- Credentials are correct
- User exists in database
- Test manually:
  ```bash
  curl -X POST http://localhost:6060/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"user@example.com","password":"secret"}'
  ```

### Payment failures

**Check:**

- Braintree is in sandbox mode
- `ENABLE_PAYMENT=true` is set
- Auth credentials are provided (or auto-registration successful)
- `/braintree/token` endpoint is accessible
- Product data has valid `_id` field (validation error fixed)

### High error rates

**Investigate:**

- Server logs for errors
- Database connection pool status
- Memory usage
- Network latency
- Rate limiting

---

## CI/CD Integration

**GitHub Actions example:**

```yaml
- name: Run Spike Test
  run: |
    npm run server &
    sleep 5
    k6 run spike.test.js \
      -e BASE_URL=http://localhost:6060 \
      -e USERS_BASELINE=5 \
      -e USERS_SPIKE=100
```

---

## Additional Information

**Test Coverage:** 17/29 API endpoints (58.6%) - Customer-facing flows.

- **Public Endpoints:** 13 (These include Login and Register, which are publicly accessible and initiate the authentication process.)
- **Authenticated Endpoints:** 4 (These endpoints require a valid authentication token for access.)
- **Not Tested:** 12 (11 admin-only + 1 forgot-password)

**Documentation:**

- k6 Official Docs: https://grafana.com/docs/k6/latest/
- Test Types Guide: https://grafana.com/docs/k6/latest/testing-guides/test-types/

**Best Practices:**

- Always test in staging, never production
- Use realistic data volumes (seed database)
- Monitor system resources during tests (CPU, memory, DB connections)
- Start with small spikes, gradually increase
- Establish baseline performance before spike testing

---

**Version:** k6 v1.3.0+  
**Last Updated:** November 2025
