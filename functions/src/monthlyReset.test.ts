import assert from "node:assert/strict";
import test from "node:test";
import { calculateMonthlyReset } from "./monthlyReset.js";

test("scheduled reset carries unpaid rent and is idempotent", () => {
  const result = calculateMonthlyReset({ arrears: 500, credit: 0, lastResetMonth: "2026-07", paid: 3_000, rent: 7_500, tenant: "Tenant" }, "2026-08");
  assert.deepEqual(result, { arrearsCarried: 5_000, patch: { arrears: 5_000, credit: 0, lastResetMonth: "2026-08", paid: 0, status: "unpaid" } });
  assert.equal(calculateMonthlyReset({ lastResetMonth: "2026-08", rent: 7_500, tenant: "Tenant" }, "2026-08"), null);
});

test("scheduled reset carries excess payment as credit", () => {
  const result = calculateMonthlyReset({ arrears: 0, credit: 0, paid: 9_000, rent: 7_500, tenant: "Tenant" }, "2026-08");
  assert.deepEqual(result, { arrearsCarried: 0, patch: { arrears: 0, credit: 1_500, lastResetMonth: "2026-08", paid: 0, status: "credit" } });
});

test("scheduled reset skips vacant rooms", () => {
  assert.equal(calculateMonthlyReset({ rent: 7_500, tenant: "" }, "2026-08"), null);
});

test("scheduled reset never adds the one-time electricity fee", () => {
  const result = calculateMonthlyReset({ electricityDueEnabled: true, electricityFee: 2_500, paid: 7_500, rent: 7_500, tenant: "Tenant" }, "2026-08");
  assert.deepEqual(result, { arrearsCarried: 0, patch: { arrears: 0, credit: 0, lastResetMonth: "2026-08", paid: 0, status: "unpaid" } });
});
