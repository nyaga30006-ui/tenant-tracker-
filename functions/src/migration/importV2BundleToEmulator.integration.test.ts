import assert from "node:assert/strict";
import test from "node:test";
import {getApps, initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import {importBundleToEmulator} from "./importV2BundleToEmulator.js";
import {transformV1Export} from "./v1Transform.js";

test("imports a reconciled V1 copy into an isolated V2 emulator property", async () => {
  const projectId = process.env.GCLOUD_PROJECT ?? "demo-migration";
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "", /^(127\.0\.0\.1|localhost):\d+$/);
  assert.ok(projectId.startsWith("demo-"));
  const database = getFirestore(getApps()[0] ?? initializeApp({projectId}));
  const bundle = transformV1Export({
    electricityBills: [],
    payments: [{id: "payment-1", roomId: "room-1", tenant: "Alice", amount: 4000, method: "bank", rawDate: "2026-08-20", receiptNo: "NYG-202608-0001"}],
    rooms: [{id: "room-1", number: "Room 01", floor: 0, tenant: "Alice", rent: 7500, paid: 4000, arrears: 0, credit: 0, depositPaid: 0, depositRequired: 0, electricityDueEnabled: false, electricityPaid: 0}],
    settings: {propname: "Migration Test Property"},
    users: [{id: "migration-admin-uid", email: "migration-admin@example.test", role: "admin", username: "Migration Admin"}],
  }, {address: "Test address", city: "Kajiado", migrationDate: "2026-08-27", propertyId: "migration-test-property"});
  assert.equal(bundle.report.canImport, true);

  const count = await importBundleToEmulator(bundle, database);
  assert.ok(count >= 5);
  const [property, room, payment, user] = await Promise.all([
    database.collection("properties").doc("migration-test-property").get(),
    database.collection("properties").doc("migration-test-property").collection("rooms").doc("room-1").get(),
    database.collection("properties").doc("migration-test-property").collection("payments").doc("payment-1").get(),
    database.collection("users").doc("migration-admin-uid").get(),
  ]);
  assert.equal(property.data()?.name, "Migration Test Property");
  assert.equal(property.data()?.provisioningState, "migration-preview");
  assert.equal(room.data()?.tenant, "Alice");
  assert.equal(payment.data()?.amount, 4000);
  assert.equal(user.data()?.role, "admin");
  await assert.rejects(importBundleToEmulator(bundle, database), /already exists/);
});
