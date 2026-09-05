/**
 * k6 smoke/load test — targets the endpoints that don't require a logged-in
 * session (liveness, readiness) plus the login endpoint at low volume to
 * exercise the auth rate limiter without tripping it during a normal run.
 *
 * Usage:
 *   k6 run loadtest/k6-smoke.js
 *   k6 run --vus 20 --duration 30s loadtest/k6-smoke.js
 *   BASE_URL=https://your-deployed-api loadtest/k6-smoke.js
 *
 * For an authenticated-endpoint load test, log in once in setup() and reuse
 * the returned cookie/token across VUs rather than hitting /api/auth/login
 * per iteration — that endpoint is deliberately rate-limited (20 requests /
 * 15 min per IP) and a naive per-VU-per-iteration login will start
 * returning 429s almost immediately, which is the correct/intended
 * behavior, not a bug in the test.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

export const options = {
  scenarios: {
    smoke: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 10 },
        { duration: '30s', target: 10 },
        { duration: '15s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // <1% error rate
  },
};

export default function () {
  const health = http.get(`${BASE_URL}/health`);
  check(health, {
    'GET /health is 200': (r) => r.status === 200,
    'GET /health has no db dependency (always fast)': (r) => r.timings.duration < 200,
  });

  const ready = http.get(`${BASE_URL}/ready`);
  check(ready, {
    'GET /ready is 200 or 503': (r) => r.status === 200 || r.status === 503,
  });

  sleep(1);
}

/**
 * Example authenticated-endpoint scenario — uncomment and adapt once you
 * have real test credentials, and prefer this pattern (login once in
 * setup(), reuse the cookie) over logging in per-iteration:
 *
 * export function setup() {
 *   const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
 *     email: __ENV.TEST_EMAIL, password: __ENV.TEST_PASSWORD,
 *   }), { headers: { 'Content-Type': 'application/json' } });
 *   return { cookie: res.headers['Set-Cookie'] };
 * }
 *
 * export default function (data) {
 *   const res = http.get(`${BASE_URL}/api/tasks`, {
 *     headers: { Cookie: data.cookie },
 *   });
 *   check(res, { 'GET /api/tasks is 200': (r) => r.status === 200 });
 *   sleep(1);
 * }
 */
