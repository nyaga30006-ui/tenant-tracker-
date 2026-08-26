import assert from "node:assert/strict";
import test from "node:test";
import { getFirestore } from "firebase-admin/firestore";
import { runBillingResetsForDate } from "./index.js";

test("scheduled reset updates only due properties and remains idempotent", async () => {
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST ?? "";
  const projectId = process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? "";
  assert.match(emulatorHost, /^(127\.0\.0\.1|localhost):\d+$/, "Firestore emulator must be active");
  assert.match(projectId, /^demo-/, "Integration tests require a demo- project ID");

  const database = getFirestore();
  const dueProperty = database.collection("properties").doc("scheduled-reset-test-due");
  const otherProperty = database.collection("properties").doc("scheduled-reset-test-other");

  await Promise.all([
    database.recursiveDelete(dueProperty),
    database.recursiveDelete(otherProperty),
  ]);

  try {
    await dueProperty.set({ billingResetDay: 10, name: "Scheduled Test" });
    await otherProperty.set({ billingResetDay: 9, name: "Other Day" });
    await Promise.all([
      dueProperty.collection("rooms").doc("partial").set({
        arrears: 500,
        credit: 0,
        paid: 3000,
        rent: 7500,
        status: "partial",
        tenant: "Partial Tenant",
      }),
      dueProperty.collection("rooms").doc("credit").set({
        arrears: 0,
        credit: 0,
        paid: 9000,
        rent: 7500,
        status: "paid",
        tenant: "Credit Tenant",
      }),
      dueProperty.collection("rooms").doc("vacant").set({
        arrears: 0,
        credit: 0,
        paid: 0,
        rent: 7500,
        status: "vacant",
        tenant: "",
      }),
      otherProperty.collection("rooms").doc("untouched").set({
        arrears: 0,
        credit: 0,
        paid: 0,
        rent: 6000,
        status: "unpaid",
        tenant: "Other Tenant",
      }),
    ]);

    assert.equal(await runBillingResetsForDate({ day: 10, month: "2026-09" }), 1);

    const [partial, credit, vacant, untouched, reset] = await Promise.all([
      dueProperty.collection("rooms").doc("partial").get(),
      dueProperty.collection("rooms").doc("credit").get(),
      dueProperty.collection("rooms").doc("vacant").get(),
      otherProperty.collection("rooms").doc("untouched").get(),
      dueProperty.collection("billingResets").doc("2026-09").get(),
    ]);

    assert.deepEqual({
      arrears: partial.data()?.arrears,
      credit: partial.data()?.credit,
      lastResetMonth: partial.data()?.lastResetMonth,
      paid: partial.data()?.paid,
      status: partial.data()?.status,
    }, { arrears: 5000, credit: 0, lastResetMonth: "2026-09", paid: 0, status: "unpaid" });
    assert.equal(credit.data()?.credit, 1500);
    assert.equal(credit.data()?.lastResetMonth, "2026-09");
    assert.equal(vacant.data()?.lastResetMonth, undefined);
    assert.equal(untouched.data()?.lastResetMonth, undefined);
    assert.equal(reset.data()?.status, "completed");
    assert.equal(reset.data()?.roomsProcessed, 2);
    assert.equal(reset.data()?.arrearsCarried, 5000);

    await runBillingResetsForDate({ day: 10, month: "2026-09" });
    const repeatedReset = await dueProperty.collection("billingResets").doc("2026-09").get();
    assert.equal(repeatedReset.data()?.attempts, 1);
  } finally {
    await Promise.all([
      database.recursiveDelete(dueProperty),
      database.recursiveDelete(otherProperty),
    ]);
  }
});
