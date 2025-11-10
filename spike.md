# Spike Test: Setup and Run Guide

A comprehensive k6 spike testing guide for the e-commerce API, following k6 v1.3.0 best practices.

---

## 📋 Table of Contents

1. [What is Spike Testing?](#what-is-spike-testing)
2. [Prerequisites](#prerequisites)
3. [Test Architecture](#test-architecture)
4. [Quick Start](#quick-start)
5. [Traffic Profiles](#traffic-profiles)
6. [Feature Configurations](#feature-configurations)
7. [Running Scenarios](#running-scenarios)
8. [Understanding Results](#understanding-results)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 What is Spike Testing?

Spike testing validates your system's behavior under sudden, dramatic increases in load. This test helps identify:

- **Breaking points** under rapid traffic surges
- **Recovery capabilities** after the spike subsides
- **Resource bottlenecks** (CPU, memory, database connections)
- **Error rates** during peak load
- **Latency degradation** patterns

---

## ✅ Prerequisites

### 1. Install k6

Follow the official k6 installation guide:  
👉 **https://grafana.com/docs/k6/latest/set-up/install-k6/**

Verify installation:

```bash
k6 version
```

Expected output: `k6 v1.3.0` or higher

### 2. Start Your API

Ensure your backend is running:

```bash
npm run server
# API should be accessible at http://localhost:6060
```

### 3. Seed Test Data (Optional)

For consistent results, seed your database:

```bash
npm run seed
```

---

## 🏗️ Test Architecture

The test is organized using k6 best practices:

### Code Structure

```
spike.test.js
├── Configuration (env variables)
├── Scenarios (traffic profiles)
├── Custom Metrics (per-endpoint tracking)
├── Helper Functions
├── setup() - Prerequisites validation
├── default() - Main test iteration
│   ├── GROUP: Product Browsing
│   ├── GROUP: Product Details
│   ├── GROUP: Category Browsing
│   └── GROUP: Authenticated User Flow
├── teardown() - Cleanup
└── handleSummary() - Results processing
```

### Endpoints Covered (17 total)

**Public Endpoints (13):**

- ✅ `GET /api/v1/product/get-product` - All products
- ✅ `GET /api/v1/product/product-count` - Pagination count
- ✅ `GET /api/v1/product/product-list/:page` - Paginated products
- ✅ `GET /api/v1/product/search/:keyword` - Search products
- ✅ `POST /api/v1/product/product-filters` - Filter by price/category
- ✅ `GET /api/v1/product/get-product/:slug` - Product details
- ✅ `GET /api/v1/product/product-photo/:pid` - Product images
- ✅ `GET /api/v1/product/related-product/:pid/:cid` - Related products
- ✅ `GET /api/v1/category/get-category` - All categories
- ✅ `GET /api/v1/category/single-category/:slug` - Single category
- ✅ `GET /api/v1/product/product-category/:slug` - Products by category
- ✅ `POST /api/v1/auth/register` - User registration (auto-creation)
- ✅ `POST /api/v1/auth/login` - User login

**Authenticated Endpoints (4):**

- ✅ `GET /api/v1/auth/user-auth` - Auth verification
- ✅ `GET /api/v1/auth/orders` - User orders
- ✅ `GET /api/v1/product/braintree/token` - Payment token
- ✅ `POST /api/v1/product/braintree/payment` - Process payment

### Key Features Implemented

✅ **Auto-Registration** - Automatically creates test users when needed  
✅ **Dynamic Data Chaining** - Uses real product/category IDs from API responses  
✅ **Group Organization** - Logical flow grouping for better reporting  
✅ **Realistic Think Time** - Random delays between 2-5 seconds  
✅ **Setup Validation** - Checks API availability before testing  
✅ **Comprehensive Metrics** - Per-endpoint latency tracking  
✅ **Configurable Flows** - Enable/disable features via env vars  
✅ **Robust Error Handling** - Graceful degradation on auth/payment failures  
✅ **Fixed Payment Flow** - Sends correct ObjectId format to prevent validation errors

---

## 🚀 Quick Start

**Fastest way to get started:**

```bash
# 1. Start your API
npm run server

# 2. Run basic spike test (public endpoints only)
k6 run spike.test.js

# 3. Run with auto-registration (creates test user automatically)
k6 run spike.test.js -e ENABLE_PAYMENT=true

# 4. Run with existing credentials
k6 run spike.test.js \
  -e AUTH_EMAIL=user@example.com \
  -e AUTH_PASSWORD=yourpassword
```

---

## 📊 Traffic Profiles

### Primary Spike (Default)

Simulates a single, sustained spike event (e.g., product launch, viral marketing).

```
Timeline: ~6 minutes
┌─────────────────────────────────────────┐
│ 500 users │                             │
│           │                             │
│           │    Sustain (1m)             │
│           ┌────────────┐                │
│           │ Spike 15s  │                │
│           ┌┐          └┐               │
│  10 users ││           │  Recovery     │
│  Baseline ││           └───────────────│
│  (2m)     ││                  (2m)     │
└───────────┴┴──────────────────────────┘
```

**Use when:** Testing sustained high-traffic events

### Microbursts

Simulates multiple rapid spikes (e.g., flash sales, push notifications).

```
Timeline: ~3 minutes
┌──────────────────────────────────────┐
│ 500 │     │     │     │              │
│ users│     │     │     │              │
│      ┌─┐   ┌─┐   ┌─┐                │
│  10  │ │   │ │   │ │                │
│ users│ │   │ │   │ │                │
│      ┴─┴───┴─┴───┴─┴────────────────│
└──────────────────────────────────────┘
```

**Use when:** Testing intermittent traffic bursts

**Switch to microbursts:**

```bash
k6 run spike.test.js -e USE_MICROBURSTS=true
```

---

## ⚙️ Feature Configurations

### Environment Variables

| Variable          | Default                 | Description                  |
| ----------------- | ----------------------- | ---------------------------- |
| `BASE_URL`        | `http://localhost:6060` | API base URL                 |
| `USERS_BASELINE`  | `10`                    | Normal traffic level         |
| `USERS_SPIKE`     | `500`                   | Peak traffic level           |
| `USE_MICROBURSTS` | `false`                 | Use microburst pattern       |
| `AUTH_EMAIL`      | _(empty)_               | User email for auth flows    |
| `AUTH_PASSWORD`   | _(empty)_               | User password for auth flows |
| `ENABLE_ORDERS`   | `true`                  | Test order retrieval         |
| `ENABLE_PAYMENT`  | `false`                 | Test payment processing      |

### Feature Combinations

**Public Only** (No auth required)

```bash
k6 run spike.test.js
```

Tests: Product browsing, search, filters, categories

**Auto-Registration Flow** (No credentials needed)

```bash
k6 run spike.test.js -e ENABLE_PAYMENT=true
```

Automatically creates a test user and runs full authenticated flow including payment

**Public + Authentication** (Requires credentials)

```bash
k6 run spike.test.js \
  -e AUTH_EMAIL=user@example.com \
  -e AUTH_PASSWORD=secret
```

Tests: Everything in Public + login, user-auth, orders

**Full E-commerce Flow** (Requires credentials)

```bash
k6 run spike.test.js \
  -e AUTH_EMAIL=user@example.com \
  -e AUTH_PASSWORD=secret \
  -e ENABLE_PAYMENT=true
```

Tests: Everything + payment processing (uses sandbox mode)

---

## 🎮 Running Scenarios

### Local Development

**Basic Spike Test:**

```bash
k6 run spike.test.js
```

**Custom Spike Levels:**

```bash
k6 run spike.test.js \
  -e USERS_BASELINE=20 \
  -e USERS_SPIKE=1000
```

**With JSON Output:**

```bash
k6 run --out json=results.json spike.test.js
```

### CI/CD Integration

**GitHub Actions Example:**

```yaml
- name: Run Spike Test
  run: |
    npm run server &
    sleep 5
    k6 run spike.test.js \
      -e BASE_URL=http://localhost:6060 \
      -e USERS_BASELINE=5 \
      -e USERS_SPIKE=100 \
      --quiet
```

### Docker Usage

**macOS/Linux:**

```bash
docker run --rm -it \
  --network="host" \
  -v "$(pwd)":/scripts \
  grafana/k6:latest run /scripts/spike.test.js \
  -e BASE_URL=http://localhost:6060
```

**Windows PowerShell:**

```powershell
docker run --rm -it `
  --network="host" `
  -v "${PWD}:/scripts" `
  grafana/k6:latest run /scripts/spike.test.js `
  -e BASE_URL=http://localhost:6060
```

### Cloud Testing (k6 Cloud)

```bash
# Sign up at https://app.k6.io/
k6 login cloud --token YOUR_TOKEN

# Run test in cloud
k6 cloud spike.test.js \
  -e BASE_URL=https://your-staging-api.com \
  -e AUTH_EMAIL=user@example.com \
  -e AUTH_PASSWORD=secret
```

---

## 📈 Understanding Results

### Console Output

```
✅ API accessible at http://localhost:6060
✅ Using provided credentials              # OR
✅ Auto-registered: spike_123456@test.com  # OR
ℹ️  Running without authentication (public flows only)

running (6m00s), 000/500 VUs, 12345 complete and 0 interrupted iterations

GROUP TIMINGS:
  ✓ Product Browsing........: avg=250ms, p95=450ms
  ✓ Product Details.........: avg=180ms, p95=320ms
  ✓ Category Browsing.......: avg=120ms, p95=210ms
  ✓ Authenticated User Flow.: avg=300ms, p95=580ms

CHECKS:
  ✓ GET /product/get-product 200: 99.8%
  ✓ GET /product-count 200......: 99.9%
  ✓ POST /braintree/payment 2xx.: 90.2%

THRESHOLDS:
  ✓ http_req_duration.......: p(95)=850ms, p(99)=1500ms
  ✓ http_req_failed.........: rate=0.8%
  ✗ checks{txn:payment}.....: rate=90.2% (threshold: >95%)
```

### Key Metrics Explained

**Error Rate:** Should be < 2% during spike

- Higher rates indicate system instability

**P95 Latency:** 95% of requests faster than this

- Should be < 1000ms per threshold

**P99 Latency:** 99% of requests faster than this

- Should be < 2000ms per threshold

**Checks:** Endpoint-specific success rates

- Public endpoints: >99% expected
- Auth endpoints: >97% expected
- Payment endpoints: >90% expected (external service)

### Results Files

**Console Summary:**

- Real-time metrics during test
- Pass/fail threshold evaluation

**JSON Output:**

```
spike_results.json
```

Contains:

- Full test metrics
- Per-endpoint latency percentiles
- Check pass/fail details
- Timestamp information

**Parse Results:**

```bash
# Extract error rate
jq '.metrics.http_req_failed.values.rate' spike_results.json

# Extract p95 latency
jq '.metrics.http_req_duration.values["p(95)"]' spike_results.json

# Check failures
jq '.metrics.checks.values.fails' spike_results.json
```

---

## 🎯 Best Practices

### 1. Test Environment

- ✅ Use staging environment, never production
- ✅ Use realistic data volumes (seed database)
- ✅ Ensure resource monitoring (CPU, memory, DB)
- ✅ Test from network similar to production

### 2. Baseline First

Always establish baseline performance before spike testing:

```bash
# Run load test first (if available)
k6 run load.test.js

# Then run spike test
k6 run spike.test.js
```

### 3. Gradual Increases

Start small, increase gradually:

```bash
# Week 1: Small spike
k6 run spike.test.js -e USERS_SPIKE=100

# Week 2: Medium spike
k6 run spike.test.js -e USERS_SPIKE=300

# Week 3: Large spike
k6 run spike.test.js -e USERS_SPIKE=500
```

### 4. Monitor System Resources

While running tests, monitor:

- CPU usage
- Memory consumption
- Database connections
- Network bandwidth
- Disk I/O

### 5. Analyze Failures

When tests fail:

```bash
# Check which endpoints failed
jq '.metrics | to_entries[] | select(.key | startswith("checks{txn:")) | {endpoint: .key, rate: .value.values.rate}' spike_results.json

# Check error distribution
jq '.metrics.http_req_failed.values' spike_results.json
```

### 6. Iterate and Improve

- Fix bottlenecks found
- Re-run tests
- Compare results
- Document improvements

---

## 🔧 Troubleshooting

### Connection Errors

**Problem:** `Cannot connect to http://localhost:6060`

**Solutions:**

```bash
# Check if API is running
curl http://localhost:6060

# Check correct port
npm run server
# Look for: "Server running on 6060"

# Try explicit URL
k6 run spike.test.js -e BASE_URL=http://localhost:6060
```

### Authentication Failures

**Problem:** Login checks failing

**Solutions:**

```bash
# Verify credentials manually
curl -X POST http://localhost:6060/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret"}'

# Check user exists in database
# Ensure password is correct
# Verify auth endpoint is working
```

### Payment Test Failures

**Problem:** Payment checks failing

**Solutions:**

- Ensure Braintree is in **sandbox mode**
- Verify `ENABLE_PAYMENT=true` is set
- Check that `AUTH_EMAIL` and `AUTH_PASSWORD` are provided
- Confirm `/braintree/token` endpoint is accessible

### High Error Rates

**Problem:** Error rate > 2%

**Investigate:**

```bash
# Check server logs for errors
# Monitor database connection pool
# Check memory usage
# Verify network latency
# Review application logs
```

**Common causes:**

- Database connection pool exhaustion
- Memory limits reached
- Slow queries
- Network timeouts
- Rate limiting triggered

### Threshold Failures

**Problem:** Latency thresholds failing

**Actions:**

1. Check which endpoints are slow
2. Review database query performance
3. Check for N+1 queries
4. Consider caching
5. Optimize slow endpoints
6. Scale resources if needed

---

## 📚 Additional Resources

**k6 Documentation:**

- [Official Docs](https://grafana.com/docs/k6/latest/)
- [Test Types Guide](https://grafana.com/docs/k6/latest/testing-guides/test-types/)
- [Metrics Reference](https://grafana.com/docs/k6/latest/using-k6/metrics/)

**Monitoring:**

- Set up Grafana dashboards
- Use k6 Cloud for advanced visualization
- Monitor with Prometheus/Grafana stack

---

## 🤝 Contributing

Improvements to spike test coverage:

1. **Add missing endpoints** (admin operations, user registration)
2. **Extend scenarios** (add breakpoint testing)
3. **Improve metrics** (add custom SLOs per endpoint)
4. **Enhance reporting** (add HTML report generation)

---

## 📞 Support

**Issues with tests?**

1. Check [Troubleshooting](#troubleshooting) section
2. Review console output for specific errors
3. Examine `spike_results.json` for details
4. Verify API health independently

**Questions?**

- Read k6 docs: https://grafana.com/docs/k6/latest/
- Check test architecture section above
- Review endpoint coverage list

---

**Last Updated:** November 2025  
**k6 Version:** v1.3.0+  
**Test Coverage:** 17/29 endpoints (58.6%)
