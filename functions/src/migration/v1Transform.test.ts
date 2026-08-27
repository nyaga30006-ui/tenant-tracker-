import assert from "node:assert/strict";
import test from "node:test";
import { transformV1Export } from "./v1Transform.js";

test("transforms Version 1 records into a property-scoped Version 2 bundle", () => {
  const bundle = transformV1Export({
    settings: { propname: "Nyaga Property", cycleHistory: [{ monthKey: "2026-07", processed: 2, totalArrears: 3000, by: "Admin", date: "2026-07-02" }] },
    data: {
      electricityBills: [{ id: "eb1", area: "borehole", month: "2026-08", amount: 12000, status: "unpaid", dueDate: "2026-08-30", recordedBy: "Caretaker" }],
      maintenance: [{ id: "m1", title: "Tap", amount: 500, status: "open", dateReported: "2026-08-02", reporter: "Caretaker", details: { area: "Ground floor", urgency: "urgent" } }],
      rooms: [
        { id: "r1", number: "Room 01", floor: 0, tenant: "Alice", rent: 7500, paid: 4000, arrears: 0, credit: 0, depositDueEnabled: true, depositPaid: 3500, depositRequired: 7500, electricityDueEnabled: false, electricityFee: 2500, electricityPaid: 0 },
        { id: "r2", number: "Room 02", floor: 0, tenant: "", rent: 8000, paid: 0, arrears: 0, credit: 0, depositPaid: 0, depositRequired: 0, electricityDueEnabled: false, electricityPaid: 0 },
      ],
      payments: [
        { id: "p1", roomId: "r1", tenant: "Alice", amount: 4000, method: "bank", refNumber: " KCB 001 ", rawDate: "2026-08-20", receiptNo: "NYG-202608-0001", by: "Caretaker", paymentType: "rent" },
        { id: "p0", roomId: "r1", tenant: "Former Tenant", amount: 3000, method: "mpesa", mpesaCode: "MPESA01", rawDate: "2026-05-02", receiptNo: "NYG-202605-0001", by: "Caretaker", paymentType: "deposit" },
      ],
      users: [
        { id: "admin-uid", username: "Admin", email: "admin@example.com", role: "admin" },
        { id: "caretaker-uid", username: "Caretaker", email: "care@example.com", role: "caretaker" },
      ],
    },
  }, { address: "Kitengela", city: "Kajiado", migrationDate: "2026-08-27", propertyId: "nyaga-property" });

  assert.equal(bundle.report.canImport, true);
  assert.equal(bundle.property.id, "nyaga-property");
  assert.equal(bundle.property.units, 2);
  assert.equal(bundle.property.occupiedUnits, 1);
  assert.equal(bundle.collections.rooms.length, 2);
  assert.equal(bundle.collections.payments.length, 2);
  assert.equal(bundle.collections.paymentReferences.length, 2);
  assert.equal(bundle.collections.electricityBills.length, 1);
  assert.equal(bundle.collections.electricityBills[0].area, "borehole");
  assert.equal(bundle.collections.maintenance[0].urgency, "urgent");
  assert.equal(bundle.collections.tenantResidencies.length, 2);
  assert.equal(bundle.collections.tenantResidencies.find((item) => item.status === "active")?.depositHeld, 3500);
  assert.equal(bundle.collections.rooms[0].activeResidencyId, "legacy-active-r1-alice");
  assert.equal(bundle.collections.payments[0].residency, "current");
  assert.equal(bundle.collections.payments[1].residency, "former");
  assert.equal(bundle.collections.payments[1].paymentType, "deposit");
  assert.deepEqual(bundle.users[1].assignedPropertyIds, ["nyaga-property"]);
  assert.equal(bundle.report.paymentAmountTotal, 7000);
});

test("blocks import when receipts or non-empty payment references are duplicated", () => {
  const bundle = transformV1Export({
    rooms: [{ id: "r1", tenant: "Alice", rent: 7500 }],
    payments: [
      { id: "p1", roomId: "r1", tenant: "Alice", amount: 1000, receiptNo: "R-1", refNumber: "ABC 123" },
      { id: "p2", roomId: "r1", tenant: "Alice", amount: 1000, receiptNo: "R-1", refNumber: "abc123" },
    ],
  }, { address: "", city: "", migrationDate: "2026-08-27", propertyId: "nyaga-property" });

  assert.equal(bundle.report.canImport, false);
  assert.ok(bundle.report.errors.includes("Duplicate receipt number: R-1"));
  assert.ok(bundle.report.errors.includes("Duplicate payment reference: ABC123"));
});

test("can preserve duplicate Version 1 receipts with deterministic migration suffixes", () => {
  const bundle = transformV1Export({
    settings: {propname: "Incorrect legacy name"},
    rooms: [{id: "r1", number: "Room 01", tenant: "Alice", rent: 7500}],
    payments: [
      {id: "p1", roomId: "r1", tenant: "Alice", amount: 1000, receiptNo: "R-1", rawDate: "2026-08-01"},
      {id: "p2", roomId: "r1", tenant: "Alice", amount: 2000, receiptNo: "R-1", rawDate: "2026-08-02"},
    ],
  }, {
    address: "",
    city: "",
    duplicateReceiptStrategy: "suffix",
    migrationDate: "2026-08-27",
    propertyId: "nyaga-property",
    propertyName: "Nyaga Property",
  });

  assert.equal(bundle.report.canImport, true);
  assert.equal(bundle.property.name, "Nyaga Property");
  assert.equal(bundle.collections.payments[0].receiptNo, "R-1");
  assert.equal(bundle.collections.payments[1].receiptNo, "R-1-MIG2");
  assert.equal(bundle.collections.payments[1].legacyReceiptNo, "R-1");
  assert.ok(bundle.report.warnings.some((warning) => warning.includes("Duplicate Version 1 receipt R-1")));
});

test("blocks ambiguous Version 1 electricity balances and duplicate room numbers", () => {
  const bundle = transformV1Export({
    rooms: [
      { id: "r1", number: "Room 01", tenant: "Alice", rent: 7000, electricityDueEnabled: true },
      { id: "r2", number: " room 01 ", tenant: "", rent: 7000 },
    ],
  }, { address: "", city: "", migrationDate: "2026-08-27", propertyId: "nyaga-property" });

  assert.equal(bundle.report.canImport, false);
  assert.ok(bundle.report.errors.some((error) => error.startsWith("Duplicate room number:")));
  assert.ok(bundle.report.errors.some((error) => error.includes("no separate electricityPaid balance")));
});
