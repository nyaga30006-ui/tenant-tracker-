import {readFileSync} from "node:fs";
import {assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment} from "@firebase/rules-unit-testing";
import {collection, doc, getDoc, getDocs, setDoc, updateDoc} from "firebase/firestore";
import {afterAll, beforeAll, beforeEach, describe, expect, test} from "vitest";

const projectId = "demo-myproperty-transition";
const emulatorAddress = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
const separator = emulatorAddress.lastIndexOf(":");
const host = emulatorAddress.slice(0, separator);
const port = Number(emulatorAddress.slice(separator + 1));
let environment: RulesTestEnvironment;

const profiles = {
  admin: {assignedPropertyIds: [], disabled: false, landlordAccess: "full", role: "admin", username: "Admin"},
  caretaker: {assignedPropertyIds: ["property-a"], disabled: false, landlordAccess: "view", role: "caretaker", username: "Caretaker"},
  disabled: {assignedPropertyIds: ["property-a"], disabled: true, landlordAccess: "view", role: "caretaker", username: "Disabled"},
  landlord: {assignedPropertyIds: ["property-a"], disabled: false, landlordAccess: "view", role: "landlord", username: "Landlord"},
} as const;

async function seed() {
  await environment.withSecurityRulesDisabled(async (context) => {
    const database = context.firestore();
    await Promise.all([
      ...Object.entries(profiles).map(([id, profile]) => setDoc(doc(database, "users", id), profile)),
      setDoc(doc(database, "settings", "app"), {propname: "Legacy Property"}),
      setDoc(doc(database, "rooms", "legacy-room"), {number: "Room 01", paid: 0, tenant: "Alice"}),
      setDoc(doc(database, "properties", "property-a"), {name: "Property A"}),
      setDoc(doc(database, "properties", "property-b"), {name: "Property B"}),
      setDoc(doc(database, "properties", "property-a", "rooms", "room-1"), {number: "01", paid: 0, tenant: "Alice"}),
    ]);
  });
}

describe("temporary V1 to V2 transition rules", () => {
  beforeAll(async () => {
    environment = await initializeTestEnvironment({
      projectId,
      firestore: {host, port, rules: readFileSync(new URL("../../firestore.transition.rules", import.meta.url), "utf8")},
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

  test("keeps the signed-in V1 app readable while blocking signed-out and disabled users", async () => {
    const caretaker = environment.authenticatedContext("caretaker").firestore();
    const disabled = environment.authenticatedContext("disabled").firestore();
    const signedOut = environment.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(caretaker, "rooms", "legacy-room")));
    await assertSucceeds(getDocs(collection(caretaker, "users")));
    await assertFails(getDoc(doc(disabled, "rooms", "legacy-room")));
    await assertFails(getDoc(doc(signedOut, "settings", "app")));
  });

  test("preserves V1 caretaker payment and restricted room workflows", async () => {
    const database = environment.authenticatedContext("caretaker").firestore();
    await assertSucceeds(setDoc(doc(database, "payments", "legacy-payment"), {amount: 1000, createdBy: "caretaker", roomId: "legacy-room"}));
    await assertSucceeds(updateDoc(doc(database, "rooms", "legacy-room"), {paid: 1000, updatedAt: "2026-08-27", updatedBy: "Caretaker"}));
    await assertFails(updateDoc(doc(database, "rooms", "legacy-room"), {arrears: 0}));
  });

  test("keeps V2 property isolation during the rollback window", async () => {
    const caretaker = environment.authenticatedContext("caretaker").firestore();
    await assertSucceeds(getDoc(doc(caretaker, "properties", "property-a")));
    await assertFails(getDoc(doc(caretaker, "properties", "property-b")));
    await assertFails(updateDoc(doc(caretaker, "properties", "property-a", "rooms", "room-1"), {tenant: "Changed"}));
    const admin = environment.authenticatedContext("admin").firestore();
    const properties = await assertSucceeds(getDocs(collection(admin, "properties")));
    expect(properties.size).toBe(2);
  });
});
