import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

const projectId = "demo-myproperty";
const emulatorAddress = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
const separator = emulatorAddress.lastIndexOf(":");
const host = emulatorAddress.slice(0, separator);
const port = Number(emulatorAddress.slice(separator + 1));

let environment: RulesTestEnvironment;

const profiles = {
  admin: {
    assignedPropertyIds: [],
    disabled: false,
    email: "admin@myproperty.test",
    landlordAccess: "full",
    role: "admin",
    username: "Test Admin",
  },
  caretaker: {
    assignedPropertyIds: ["property-a"],
    disabled: false,
    email: "caretaker@myproperty.test",
    landlordAccess: "view",
    role: "caretaker",
    username: "Test Caretaker",
  },
  disabledCaretaker: {
    assignedPropertyIds: ["property-a"],
    disabled: true,
    email: "disabled@myproperty.test",
    landlordAccess: "view",
    role: "caretaker",
    username: "Disabled Caretaker",
  },
  fullLandlord: {
    assignedPropertyIds: ["property-a"],
    disabled: false,
    email: "full@myproperty.test",
    landlordAccess: "full",
    role: "landlord",
    username: "Full Landlord",
  },
  viewLandlord: {
    assignedPropertyIds: ["property-a"],
    disabled: false,
    email: "view@myproperty.test",
    landlordAccess: "view",
    role: "landlord",
    username: "View Landlord",
  },
} as const;

const property = {
  address: "Test Road",
  billingResetDay: 10,
  city: "Nairobi",
  collectedThisMonth: 0,
  landlordId: "viewLandlord",
  maintenanceUnits: 0,
  monthlyRentTarget: 7500,
  name: "Property A",
  occupiedUnits: 1,
  preferredPaymentMethod: "mpesa",
  units: 1,
};

const room = {
  arrears: 7500,
  credit: 0,
  floor: 0,
  number: "01",
  paid: 0,
  rent: 7500,
  status: "unpaid",
  tenant: "Alice Tenant",
};

function payment(id: string, referenceKey = "MPESA001") {
  return {
    amount: 7500,
    method: "mpesa",
    provider: "mpesa",
    receivedAt: "2026-08-22T09:00:00+03:00",
    reference: "MPESA001",
    referenceKey,
    roomId: "room-01",
    status: "confirmed",
    tenant: "Alice Tenant",
  };
}

async function seed() {
  await environment.withSecurityRulesDisabled(async (context) => {
    const database = context.firestore();
    await Promise.all([
      ...Object.entries(profiles).map(([id, profile]) => setDoc(doc(database, "users", id), profile)),
      setDoc(doc(database, "properties", "property-a"), property),
      setDoc(doc(database, "properties", "property-b"), { ...property, name: "Property B" }),
      setDoc(doc(database, "properties", "property-a", "rooms", "room-01"), room),
      setDoc(doc(database, "properties", "property-b", "rooms", "room-01"), room),
    ]);
  });
}

async function createReferencedPayment(userId: string, id: string, referenceKey = "MPESA001") {
  const database = environment.authenticatedContext(userId).firestore();
  const batch = writeBatch(database);
  batch.set(doc(database, "properties", "property-a", "payments", id), payment(id, referenceKey));
  batch.set(doc(database, "properties", "property-a", "paymentReferences", referenceKey), {
    paymentId: id,
    reference: "MPESA001",
  });
  return batch.commit();
}

describe("Firestore property and role isolation", () => {
  beforeAll(async () => {
    environment = await initializeTestEnvironment({
      projectId,
      firestore: {
        host,
        port,
        rules: readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8"),
      },
    });
  });

  beforeEach(async () => {
    await environment.clearFirestore();
    await seed();
  });

  afterAll(async () => {
    await environment.clearFirestore();
    await environment.cleanup();
  });

  test("signed-out and disabled users cannot read property data", async () => {
    const signedOut = environment.unauthenticatedContext().firestore();
    const disabled = environment.authenticatedContext("disabledCaretaker").firestore();
    await assertFails(getDoc(doc(signedOut, "properties", "property-a")));
    await assertFails(getDoc(doc(disabled, "properties", "property-a")));
  });

  test("admin can see every property and manage rooms and users", async () => {
    const database = environment.authenticatedContext("admin").firestore();
    const snapshot = await assertSucceeds(getDocs(collection(database, "properties")));
    expect(snapshot.size).toBe(2);
    await assertSucceeds(setDoc(doc(database, "properties", "property-a", "rooms", "room-02"), { ...room, number: "02" }));
    await assertSucceeds(setDoc(doc(database, "users", "new-user"), { ...profiles.caretaker, email: "new@myproperty.test" }));
  });

  test("caretaker is isolated to one property and only permitted room fields", async () => {
    const database = environment.authenticatedContext("caretaker").firestore();
    await assertSucceeds(getDoc(doc(database, "properties", "property-a")));
    await assertFails(getDoc(doc(database, "properties", "property-b")));
    await assertFails(getDocs(collection(database, "properties")));
    await assertSucceeds(updateDoc(doc(database, "properties", "property-a", "rooms", "room-01"), {
      arrears: 0,
      paid: 7500,
      status: "paid",
      updatedAt: "2026-08-22T09:00:00+03:00",
    }));
    await assertFails(updateDoc(doc(database, "properties", "property-a", "rooms", "room-01"), { tenant: "Changed Tenant" }));
    await assertFails(setDoc(doc(database, "properties", "property-a", "rooms", "room-02"), { ...room, number: "02" }));
  });

  test("view landlord is read-only while full landlord can operate the assigned property", async () => {
    const viewDatabase = environment.authenticatedContext("viewLandlord").firestore();
    const fullDatabase = environment.authenticatedContext("fullLandlord").firestore();
    await assertSucceeds(getDoc(doc(viewDatabase, "properties", "property-a", "rooms", "room-01")));
    await assertFails(updateDoc(doc(viewDatabase, "properties", "property-a", "rooms", "room-01"), { paid: 7500 }));
    await assertSucceeds(setDoc(doc(fullDatabase, "properties", "property-a", "rooms", "room-02"), { ...room, number: "02" }));
    await assertSucceeds(createReferencedPayment("fullLandlord", "payment-full"));
  });

  test("landlord can request full access but cannot grant it to themselves", async () => {
    const database = environment.authenticatedContext("viewLandlord").firestore();
    await assertSucceeds(updateDoc(doc(database, "users", "viewLandlord"), {
      landlordAccessRequest: "full",
      updatedAt: "2026-08-22T09:00:00+03:00",
    }));
    await assertFails(updateDoc(doc(database, "users", "viewLandlord"), { landlordAccess: "full" }));
  });

  test("non-cash payment must reserve its reference atomically and cannot reuse it", async () => {
    const database = environment.authenticatedContext("caretaker").firestore();
    await assertFails(setDoc(doc(database, "properties", "property-a", "payments", "missing-reference"), payment("missing-reference")));
    await assertSucceeds(createReferencedPayment("caretaker", "payment-one"));

    const duplicate = writeBatch(database);
    duplicate.set(doc(database, "properties", "property-a", "payments", "payment-two"), payment("payment-two"));
    duplicate.set(doc(database, "properties", "property-a", "paymentReferences", "MPESA001"), {
      paymentId: "payment-two",
      reference: "MPESA001",
    });
    await assertFails(duplicate.commit());
  });
});
