import { randomIntBetween } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";
import { check, group, sleep } from "k6";
import http from "k6/http";
import { Counter, Rate, Trend } from "k6/metrics";

// ========================================
// CONFIGURATION
// ========================================
const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";
const USERS_BASELINE = Number(__ENV.USERS_BASELINE || 10);
const USERS_SPIKE = Number(__ENV.USERS_SPIKE || 500);
const USE_MICROBURSTS =
  (__ENV.USE_MICROBURSTS || "false").toLowerCase() === "true";
const AUTH_EMAIL = __ENV.AUTH_EMAIL || "";
const AUTH_PASSWORD = __ENV.AUTH_PASSWORD || "";

// Feature flags
const ENABLE_ORDERS = (__ENV.ENABLE_ORDERS || "true").toLowerCase() === "true";
const ENABLE_PAYMENT =
  (__ENV.ENABLE_PAYMENT || "false").toLowerCase() === "true";
const BRAINTREE_NONCE = __ENV.BRAINTREE_NONCE || "fake-valid-nonce";

// ========================================
// SCENARIOS / SPIKE PROFILES
// ========================================
const stagesPrimary = [
  { duration: "2m", target: USERS_BASELINE }, // Baseline
  { duration: "15s", target: USERS_SPIKE }, // Rapid spike
  { duration: "1m", target: USERS_SPIKE }, // Sustain spike
  { duration: "15s", target: USERS_BASELINE }, // Recovery
  { duration: "2m", target: USERS_BASELINE }, // Post-recovery baseline
];

const stagesMicrobursts = [
  { duration: "1m", target: USERS_BASELINE },
  { duration: "5s", target: USERS_SPIKE },
  { duration: "10s", target: USERS_SPIKE },
  { duration: "5s", target: USERS_BASELINE },
  { duration: "10s", target: USERS_BASELINE },
  { duration: "5s", target: USERS_SPIKE },
  { duration: "10s", target: USERS_SPIKE },
  { duration: "5s", target: USERS_BASELINE },
  { duration: "10s", target: USERS_BASELINE },
  { duration: "5s", target: USERS_SPIKE },
  { duration: "10s", target: USERS_SPIKE },
  { duration: "1m", target: USERS_BASELINE },
];

export const options = {
  scenarios: {
    spike: {
      executor: "ramping-vus",
      startVUs: USERS_BASELINE,
      stages: USE_MICROBURSTS ? stagesMicrobursts : stagesPrimary,
      gracefulRampDown: "30s",
      tags: { scenario: USE_MICROBURSTS ? "microburst" : "primary" },
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.02"], // <2% errors during spike
    http_req_duration: ["p(95)<1000", "p(99)<2000"],
    // Public endpoints - strict
    "checks{txn:products_list}": ["rate>0.99"],
    "checks{txn:products_page}": ["rate>0.99"],
    "checks{txn:product_count}": ["rate>0.99"],
    "checks{txn:search}": ["rate>0.99"],
    "checks{txn:categories}": ["rate>0.99"],
    "checks{txn:single_category}": ["rate>0.99"],
    "checks{txn:product_detail}": ["rate>0.99"],
    "checks{txn:product_photo}": ["rate>0.95"], // Images may be slower
    "checks{txn:product_filters}": ["rate>0.99"],
    "checks{txn:related_products}": ["rate>0.98"],
    "checks{txn:product_category}": ["rate>0.99"],
    "checks{txn:register}": ["rate>0.99"], // Registration is public, high expectation
    "checks{txn:login}": ["rate>0.97"], // Login is public, slightly relaxed during spike
    // Auth endpoints - slightly relaxed during spike
    "checks{txn:user_auth}": ["rate>0.97"],
    "checks{txn:orders}": ["rate>0.95"],
    // Payment - most relaxed (external service)
    "checks{txn:braintree_token}": ["rate>0.93"],
    "checks{txn:payment}": ["rate>0.90"],
  },
  discardResponseBodies: false,
  summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "p(99)", "max"],
};

// ========================================
// CUSTOM METRICS
// ========================================
const tProductsList = new Trend("latency_ms_products_list");
const tProductsPage = new Trend("latency_ms_products_page");
const tProductCount = new Trend("latency_ms_product_count");
const tSearch = new Trend("latency_ms_search");
const tCategories = new Trend("latency_ms_categories");
const tSingleCategory = new Trend("latency_ms_single_category");
const tProductDetail = new Trend("latency_ms_product_detail");
const tProductPhoto = new Trend("latency_ms_product_photo");
const tProductFilters = new Trend("latency_ms_product_filters");
const tRelatedProducts = new Trend("latency_ms_related_products");
const tProductCategory = new Trend("latency_ms_product_category");
const tLogin = new Trend("latency_ms_login");
const tUserAuth = new Trend("latency_ms_user_auth");
const tOrders = new Trend("latency_ms_orders");
const tBraintreeToken = new Trend("latency_ms_braintree_token");
const tPayment = new Trend("latency_ms_payment");
const tRegister = new Trend("latency_ms_register");
const errorRate = new Rate("error_rate_overall");
const failures = new Counter("failures");

// ========================================
// TEST DATA
// ========================================
const searchKeywords = [
  "phone",
  "shirt",
  "shoe",
  "bag",
  "watch",
  "laptop",
  "headphone",
  "tablet",
];
const priceRanges = [
  [0, 50],
  [0, 100],
  [50, 200],
  [100, 500],
  [0, 1000],
];

// ========================================
// HELPER FUNCTIONS
// ========================================
function randOf(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function loginIfConfigured() {
  // Check environment variables only
  if (!AUTH_EMAIL || !AUTH_PASSWORD) return null;
  return loginWithCredentials(AUTH_EMAIL, AUTH_PASSWORD);
}

function loginWithCredentials(email, password) {
  if (!email || !password) return null;

  const payload = JSON.stringify({
    email: email,
    password: password,
  });

  const res = http.post(`${BASE_URL}/api/v1/auth/login`, payload, {
    headers: { "Content-Type": "application/json" },
    tags: { txn: "login" },
  });

  tLogin.add(res.timings.duration);

  const ok = check(
    res,
    {
      "login 200": (r) => r.status === 200,
      "login has token": (r) => {
        try {
          const body = r.json();
          return !!(body.token || (body.data && body.data.token));
        } catch (_) {
          return false;
        }
      },
    },
    { txn: "login" }
  );

  if (!ok) return null;

  let token = null;
  try {
    const body = res.json();
    token = body.token || (body.data && body.data.token) || null;
  } catch (_) {}

  return token;
}

// ========================================
// USER REGISTRATION HELPER
// ========================================
function registerTestUser() {
  const timestamp = Date.now();
  const userData = {
    name: `SpikeUser_${timestamp}`,
    email: `spike_${timestamp}@test.com`,
    password: "TestPass123!",
    phone: `+1234567${timestamp.toString().slice(-4)}`,
    address: "123 Test Street, Test City, TC 12345",
    DOB: "2000-01-01",
    answer: "TestAnswer",
  };

  const res = http.post(
    `${BASE_URL}/api/v1/auth/register`,
    JSON.stringify(userData),
    {
      headers: { "Content-Type": "application/json" },
      tags: { txn: "register" },
    }
  );

  tRegister.add(res.timings.duration);

  const success = check(
    res,
    {
      "register 201": (r) => r.status === 201,
      "register success": (r) => {
        try {
          const body = r.json();
          return body.success === true;
        } catch (_) {
          return false;
        }
      },
    },
    { txn: "register" }
  );

  if (success) {
    console.log(`✅ Registered: ${userData.email}`);
    return { email: userData.email, password: userData.password };
  }

  console.log(`❌ Registration failed: ${res.status} ${res.body}`);
  return null;
}

// ========================================
// SETUP - Validate prerequisites
// ========================================
export function setup() {
  console.log("🔍 Validating test prerequisites...");

  // Check if API is accessible
  const res = http.get(BASE_URL);
  if (res.status === 0) {
    throw new Error(
      `❌ Cannot connect to ${BASE_URL}. Ensure the API is running.`
    );
  }

  console.log(`✅ API accessible at ${BASE_URL}`);

  // Enhanced credential management
  let credentials = null;

  if (AUTH_EMAIL && AUTH_PASSWORD) {
    // Try provided credentials first
    const token = loginIfConfigured();
    if (token) {
      console.log("✅ Using provided credentials");
      credentials = { email: AUTH_EMAIL, password: AUTH_PASSWORD };
    } else {
      console.warn(
        "⚠️  Provided credentials failed, attempting auto-registration"
      );
    }
  }

  // Auto-register if auth features enabled but no valid credentials
  if (!credentials && (ENABLE_ORDERS || ENABLE_PAYMENT)) {
    credentials = registerTestUser();
    if (credentials) {
      console.log(`✅ Auto-registered: ${credentials.email}`);
    } else {
      console.warn(
        "⚠️  Auto-registration failed, authenticated flows will be skipped"
      );
    }
  }

  if (!credentials) {
    console.log("ℹ️  Running without authentication (public flows only)");
  }

  return {
    timestamp: new Date().toISOString(),
    credentials: credentials,
  };
}

// ========================================
// MAIN TEST ITERATION
// ========================================
export default function (data) {
  let allChecks = true;
  const credentials = data.credentials;

  // ========================================
  // GROUP 1: Product Browsing (Public)
  // ========================================
  group("Product Browsing", function () {
    // Get all products
    const resList = http.get(`${BASE_URL}/api/v1/product/get-product`, {
      tags: { txn: "products_list" },
    });
    tProductsList.add(resList.timings.duration);
    allChecks &= check(
      resList,
      { "GET /product/get-product 200": (r) => r.status === 200 },
      { txn: "products_list" }
    );

    // Get product count (for pagination)
    const resCount = http.get(`${BASE_URL}/api/v1/product/product-count`, {
      tags: { txn: "product_count" },
    });
    tProductCount.add(resCount.timings.duration);
    allChecks &= check(
      resCount,
      { "GET /product/product-count 200": (r) => r.status === 200 },
      { txn: "product_count" }
    );

    // Get paginated products
    const page = randomIntBetween(1, 3);
    const resPage = http.get(
      `${BASE_URL}/api/v1/product/product-list/${page}`,
      { tags: { txn: "products_page" } }
    );
    tProductsPage.add(resPage.timings.duration);
    allChecks &= check(
      resPage,
      { "GET /product-list/:page 200": (r) => r.status === 200 },
      { txn: "products_page" }
    );

    // Search products
    const kw = randOf(searchKeywords);
    const resSearch = http.get(
      `${BASE_URL}/api/v1/product/search/${encodeURIComponent(kw)}`,
      { tags: { txn: "search" } }
    );
    tSearch.add(resSearch.timings.duration);
    allChecks &= check(
      resSearch,
      { "GET /search/:keyword 200": (r) => r.status === 200 },
      { txn: "search" }
    );

    // Filter products
    const priceRange = randOf(priceRanges);
    const filterPayload = JSON.stringify({
      checked: [],
      radio: priceRange,
    });
    const resFilters = http.post(
      `${BASE_URL}/api/v1/product/product-filters`,
      filterPayload,
      {
        headers: { "Content-Type": "application/json" },
        tags: { txn: "product_filters" },
      }
    );
    tProductFilters.add(resFilters.timings.duration);
    allChecks &= check(
      resFilters,
      { "POST /product/product-filters 200": (r) => r.status === 200 },
      { txn: "product_filters" }
    );
  });

  sleep(randomIntBetween(1, 2));

  // ========================================
  // GROUP 2: Product Details (Public)
  // ========================================
  let selectedProduct = null;
  let selectedCategory = null;

  group("Product Details", function () {
    // Parse product list for dynamic data with error handling
    try {
      const resList = http.get(`${BASE_URL}/api/v1/product/get-product`);
      if (resList.status === 200) {
        const listJson = resList.json();
        const productsArr = (listJson && listJson.products) || [];
        if (productsArr.length > 0) {
          selectedProduct = randOf(productsArr);
        }
      }
    } catch (e) {
      console.warn(`⚠️  Failed to parse product list: ${e.message}`);
    }

    // View product detail
    if (selectedProduct && selectedProduct.slug) {
      const resDetail = http.get(
        `${BASE_URL}/api/v1/product/get-product/${encodeURIComponent(
          selectedProduct.slug
        )}`,
        { tags: { txn: "product_detail" } }
      );
      tProductDetail.add(resDetail.timings.duration);
      allChecks &= check(
        resDetail,
        { "GET /product/get-product/:slug 200": (r) => r.status === 200 },
        { txn: "product_detail" }
      );

      // Get product photo
      if (selectedProduct._id) {
        const resPhoto = http.get(
          `${BASE_URL}/api/v1/product/product-photo/${selectedProduct._id}`,
          { tags: { txn: "product_photo" } }
        );
        tProductPhoto.add(resPhoto.timings.duration);
        allChecks &= check(
          resPhoto,
          {
            "GET /product-photo/:pid 200": (r) =>
              r.status === 200 || r.status === 304,
          },
          { txn: "product_photo" }
        );
      }

      // Get related products
      if (selectedProduct._id && selectedProduct.category) {
        const categoryId =
          typeof selectedProduct.category === "object"
            ? selectedProduct.category._id
            : selectedProduct.category;

        const resRelated = http.get(
          `${BASE_URL}/api/v1/product/related-product/${selectedProduct._id}/${categoryId}`,
          { tags: { txn: "related_products" } }
        );
        tRelatedProducts.add(resRelated.timings.duration);
        allChecks &= check(
          resRelated,
          { "GET /related-product/:pid/:cid 200": (r) => r.status === 200 },
          { txn: "related_products" }
        );
      }
    }
  });

  sleep(randomIntBetween(1, 3));

  // ========================================
  // GROUP 3: Category Browsing (Public)
  // ========================================
  group("Category Browsing", function () {
    // Get all categories
    const resCat = http.get(`${BASE_URL}/api/v1/category/get-category`, {
      tags: { txn: "categories" },
    });
    tCategories.add(resCat.timings.duration);
    allChecks &= check(
      resCat,
      { "GET /category/get-category 200": (r) => r.status === 200 },
      { txn: "categories" }
    );

    // Parse categories for dynamic data with error handling
    try {
      if (resCat.status === 200) {
        const catJson = resCat.json();
        const categoriesArr = (catJson && catJson.category) || [];
        if (categoriesArr.length > 0) {
          selectedCategory = randOf(categoriesArr);
        }
      }
    } catch (e) {
      console.warn(`⚠️  Failed to parse categories: ${e.message}`);
    }

    // View single category
    if (selectedCategory && selectedCategory.slug) {
      const resSingleCat = http.get(
        `${BASE_URL}/api/v1/category/single-category/${encodeURIComponent(
          selectedCategory.slug
        )}`,
        { tags: { txn: "single_category" } }
      );
      tSingleCategory.add(resSingleCat.timings.duration);
      allChecks &= check(
        resSingleCat,
        { "GET /single-category/:slug 200": (r) => r.status === 200 },
        { txn: "single_category" }
      );

      // Get products by category
      const resProdCat = http.get(
        `${BASE_URL}/api/v1/product/product-category/${selectedCategory.slug}`,
        { tags: { txn: "product_category" } }
      );
      tProductCategory.add(resProdCat.timings.duration);
      allChecks &= check(
        resProdCat,
        { "GET /product-category/:slug 200": (r) => r.status === 200 },
        { txn: "product_category" }
      );
    }
  });

  sleep(randomIntBetween(1, 2));

  // ========================================
  // GROUP 4: Authenticated User Flow
  // ========================================
  if (credentials) {
    group("Authenticated User Flow", function () {
      // Pass credentials directly to avoid global state
      const token = loginWithCredentials(credentials.email, credentials.password);

      if (token) {
        // Verify user authentication
        const resUser = http.get(`${BASE_URL}/api/v1/auth/user-auth`, {
          headers: { Authorization: `Bearer ${token}` },
          tags: { txn: "user_auth" },
        });
        tUserAuth.add(resUser.timings.duration);
        allChecks &= check(
          resUser,
          { "GET /auth/user-auth 200": (r) => r.status === 200 },
          { txn: "user_auth" }
        );

        // Get user orders
        if (ENABLE_ORDERS) {
          const resOrders = http.get(`${BASE_URL}/api/v1/auth/orders`, {
            headers: { Authorization: `Bearer ${token}` },
            tags: { txn: "orders" },
          });
          tOrders.add(resOrders.timings.duration);
          allChecks &= check(
            resOrders,
            { "GET /auth/orders 200": (r) => r.status === 200 },
            { txn: "orders" }
          );
        }

        sleep(randomIntBetween(1, 2));

        // Payment flow (if enabled)
        if (ENABLE_PAYMENT && selectedProduct) {
          // Validate we have required product data
          if (!selectedProduct._id) {
            console.warn("⚠️  Cannot process payment: missing product._id");
            allChecks = false;
          } else {
            // CRITICAL: Get Braintree token first
            const resToken = http.get(
              `${BASE_URL}/api/v1/product/braintree/token`,
              {
                headers: { Authorization: `Bearer ${token}` },
                tags: { txn: "braintree_token" },
              }
            );
            tBraintreeToken.add(resToken.timings.duration);
            const tokenOk = check(
              resToken,
              { "GET /braintree/token 200": (r) => r.status === 200 },
              { txn: "braintree_token" }
            );
            allChecks &= tokenOk;

            if (tokenOk) {
              // Process payment with configurable nonce
              const price =
                typeof selectedProduct?.price === "number" &&
                selectedProduct.price > 0
                  ? selectedProduct.price
                  : 10;

              const payBody = JSON.stringify({
                nonce: BRAINTREE_NONCE,
                cart: [
                  {
                    _id: selectedProduct._id,
                    price: price,
                  },
                ],
              });

              const resPay = http.post(
                `${BASE_URL}/api/v1/product/braintree/payment`,
                payBody,
                {
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  tags: { txn: "payment" },
                }
              );
              tPayment.add(resPay.timings.duration);

              const paymentSuccess = check(
                resPay,
                {
                  "POST /braintree/payment 2xx": (r) =>
                    r.status >= 200 && r.status < 300,
                  "payment response ok": (r) => {
                    try {
                      const body = r.json();
                      return body.ok === true;
                    } catch (_) {
                      return false;
                    }
                  },
                },
                { txn: "payment" }
              );

              if (!paymentSuccess) {
                console.warn(
                  `⚠️  Payment failed: ${resPay.status} ${resPay.body}`
                );
              }

              allChecks &= paymentSuccess;
            }
          }
        }
      } else {
        console.warn("⚠️  Authentication failed in iteration");
        // Don't fail entire iteration, just skip auth flows
      }
    });
  }

  // Track overall success
  errorRate.add(!allChecks);
  if (!allChecks) {
    failures.add(1);
  }

  // Realistic think time between iterations
  sleep(randomIntBetween(2, 5));
}

// ========================================
// TEARDOWN - Cleanup
// ========================================
export function teardown(data) {
  console.log(`\n✅ Test completed at: ${new Date().toISOString()}`);
  console.log(`📊 Started at: ${data.timestamp}`);
}

// ========================================
// CUSTOM SUMMARY
// ========================================
export function handleSummary(data) {
  const summary = {
    test_info: {
      started_at: data.state && data.state.testRunDurationMs,
      scenario: USE_MICROBURSTS ? "microburst" : "primary_spike",
      baseline_users: USERS_BASELINE,
      spike_users: USERS_SPIKE,
    },
    overall_metrics: {
      error_rate:
        (data.metrics.http_req_failed &&
          data.metrics.http_req_failed.values &&
          data.metrics.http_req_failed.values.rate) ||
        0,
      http_reqs:
        (data.metrics.http_reqs && data.metrics.http_reqs.values.count) || 0,
      p95_ms:
        (data.metrics.http_req_duration &&
          data.metrics.http_req_duration.values &&
          data.metrics.http_req_duration.values["p(95)"]) ||
        0,
      p99_ms:
        (data.metrics.http_req_duration &&
          data.metrics.http_req_duration.values &&
          data.metrics.http_req_duration.values["p(99)"]) ||
        0,
    },
    endpoint_latency_p95: {
      products_list:
        (data.metrics.latency_ms_products_list &&
          data.metrics.latency_ms_products_list.values &&
          data.metrics.latency_ms_products_list.values["p(95)"]) ||
        0,
      products_page:
        (data.metrics.latency_ms_products_page &&
          data.metrics.latency_ms_products_page.values &&
          data.metrics.latency_ms_products_page.values["p(95)"]) ||
        0,
      product_count:
        (data.metrics.latency_ms_product_count &&
          data.metrics.latency_ms_product_count.values &&
          data.metrics.latency_ms_product_count.values["p(95)"]) ||
        0,
      search:
        (data.metrics.latency_ms_search &&
          data.metrics.latency_ms_search.values &&
          data.metrics.latency_ms_search.values["p(95)"]) ||
        0,
      categories:
        (data.metrics.latency_ms_categories &&
          data.metrics.latency_ms_categories.values &&
          data.metrics.latency_ms_categories.values["p(95)"]) ||
        0,
      single_category:
        (data.metrics.latency_ms_single_category &&
          data.metrics.latency_ms_single_category.values &&
          data.metrics.latency_ms_single_category.values["p(95)"]) ||
        0,
      product_detail:
        (data.metrics.latency_ms_product_detail &&
          data.metrics.latency_ms_product_detail.values &&
          data.metrics.latency_ms_product_detail.values["p(95)"]) ||
        0,
      product_photo:
        (data.metrics.latency_ms_product_photo &&
          data.metrics.latency_ms_product_photo.values &&
          data.metrics.latency_ms_product_photo.values["p(95)"]) ||
        0,
      product_filters:
        (data.metrics.latency_ms_product_filters &&
          data.metrics.latency_ms_product_filters.values &&
          data.metrics.latency_ms_product_filters.values["p(95)"]) ||
        0,
      related_products:
        (data.metrics.latency_ms_related_products &&
          data.metrics.latency_ms_related_products.values &&
          data.metrics.latency_ms_related_products.values["p(95)"]) ||
        0,
      product_category:
        (data.metrics.latency_ms_product_category &&
          data.metrics.latency_ms_product_category.values &&
          data.metrics.latency_ms_product_category.values["p(95)"]) ||
        0,
      register:
        (data.metrics.latency_ms_register &&
          data.metrics.latency_ms_register.values &&
          data.metrics.latency_ms_register.values["p(95)"]) ||
        0,
      login:
        (data.metrics.latency_ms_login &&
          data.metrics.latency_ms_login.values &&
          data.metrics.latency_ms_login.values["p(95)"]) ||
        0,
      user_auth:
        (data.metrics.latency_ms_user_auth &&
          data.metrics.latency_ms_user_auth.values &&
          data.metrics.latency_ms_user_auth.values["p(95)"]) ||
        0,
      orders:
        (data.metrics.latency_ms_orders &&
          data.metrics.latency_ms_orders.values &&
          data.metrics.latency_ms_orders.values["p(95)"]) ||
        0,
      braintree_token:
        (data.metrics.latency_ms_braintree_token &&
          data.metrics.latency_ms_braintree_token.values &&
          data.metrics.latency_ms_braintree_token.values["p(95)"]) ||
        0,
      payment:
        (data.metrics.latency_ms_payment &&
          data.metrics.latency_ms_payment.values &&
          data.metrics.latency_ms_payment.values["p(95)"]) ||
        0,
    },
    checks: {
      total_checks:
        (data.metrics.checks && data.metrics.checks.values.count) || 0,
      passed: (data.metrics.checks && data.metrics.checks.values.passes) || 0,
      failed: (data.metrics.checks && data.metrics.checks.values.fails) || 0,
      pass_rate: (data.metrics.checks && data.metrics.checks.values.rate) || 0,
    },
  };

  return {
    stdout: `\n${"=".repeat(60)}\n📊 SPIKE TEST SUMMARY\n${"=".repeat(60)}\n${JSON.stringify(
      summary,
      null,
      2
    )}\n${"=".repeat(60)}\n`,
    "spike_results.json": JSON.stringify(data, null, 2),
  };
}
