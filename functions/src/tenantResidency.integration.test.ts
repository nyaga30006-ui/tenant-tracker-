import assert from "node:assert/strict";
import test from "node:test";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

test("caretaker can manage occupancy and financial terms", async () => {
  const projectId = process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? "demo-myproperty";
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
  const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
  const functionsHost = process.env.FIREBASE_FUNCTIONS_EMULATOR_HOST ?? "127.0.0.1:5001";
  assert.match(projectId, /^demo-/, "Integration tests require a demo project");
  assert.match(authHost, /^(127\.0\.0\.1|localhost):\d+$/, "Auth emulator must be active");
  assert.match(firestoreHost, /^(127\.0\.0\.1|localhost):\d+$/, "Firestore emulator must be active");
  assert.match(functionsHost, /^(127\.0\.0\.1|localhost):\d+$/, "Functions emulator must be active");
  process.env.GCLOUD_PROJECT = projectId;
  process.env.FIREBASE_AUTH_EMULATOR_HOST = authHost;
  process.env.FIRESTORE_EMULATOR_HOST = firestoreHost;

  const app = getApps()[0] ?? initializeApp({ projectId });
  const authentication = getAuth(app);
  const database = getFirestore(app);
  const userId = "tenant-workflow-test-caretaker";
  const propertyId = "tenant-workflow-test-property";
  const email = "tenant-workflow-caretaker@myproperty.test";
  const password = "TenantTest123!";
  const propertyReference = database.collection("properties").doc(propertyId);

  await database.recursiveDelete(propertyReference);
  await database.collection("users").doc(userId).delete();
  try {
    await authentication.deleteUser(userId);
  } catch {
    // A previous test user may not exist.
  }

  try {
    await authentication.createUser({ uid: userId, email, password });
    await database.collection("users").doc(userId).set({
      assignedPropertyIds: [propertyId], disabled: false, email, landlordAccess: "view", role: "caretaker", username: "Workflow Caretaker",
    });
    await propertyReference.set({ billingResetDay: 10, name: "Tenant Workflow Test" });
    await propertyReference.collection("rooms").doc("room-01").set({
      arrears: 0, credit: 0, depositDueEnabled: false, depositPaid: 0, depositRequired: 7000,
      electricityDueEnabled: false, electricityFee: 2500, electricityPaid: 0, floor: 0,
      number: "01", paid: 0, rent: 7000, status: "vacant", tenant: "",
    });

    const signInResponse = await fetch(`http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key`, {
      body: JSON.stringify({ email, password, returnSecureToken: true }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    assert.equal(signInResponse.status, 200);
    const token = String((await signInResponse.json() as { idToken?: string }).idToken ?? "");
    assert.ok(token);

    async function call(data: Record<string, unknown>) {
      const endpoint = `http://${functionsHost}/${projectId}/africa-south1/manageTenantResidency`;
      const response = await fetch(endpoint, {
        body: JSON.stringify({ data }),
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        method: "POST",
      });
      assert.equal(response.status, 200, `${endpoint}: ${await response.text()}`);
    }

    await call({
      action: "moveIn",
      propertyId,
      residency: { depositHeld: 6000, id: "residency-01", moveInDate: "2026-08-20", movedInBy: "Forged Name", roomId: "room-01", status: "active", tenantName: "Test Tenant" },
      room: { electricityDueEnabled: true, id: "room-01", rent: 8200, depositRequired: 9000 },
    });
    const [occupiedRoom, activeResidency] = await Promise.all([
      propertyReference.collection("rooms").doc("room-01").get(),
      propertyReference.collection("tenantResidencies").doc("residency-01").get(),
    ]);
    assert.equal(occupiedRoom.data()?.tenant, "Test Tenant");
    assert.equal(occupiedRoom.data()?.rent, 8200);
    assert.equal(occupiedRoom.data()?.depositRequired, 9000);
    assert.equal(occupiedRoom.data()?.electricityDueEnabled, true);
    assert.equal(activeResidency.data()?.depositHeld, 6000);
    assert.equal(activeResidency.data()?.movedInBy, "Workflow Caretaker");

    await call({
      action: "moveOut",
      propertyId,
      residency: { deductionNote: "Applied to outstanding rent", depositAppliedToBalance: 6000, depositDeducted: 6000, depositRefunded: 0, finalBalance: 2200, id: "residency-01", moveOutDate: "2026-08-21" },
      room: { id: "room-01" },
    });
    const [vacantRoom, formerResidency] = await Promise.all([
      propertyReference.collection("rooms").doc("room-01").get(),
      propertyReference.collection("tenantResidencies").doc("residency-01").get(),
    ]);
    assert.equal(vacantRoom.data()?.tenant, "");
    assert.equal(vacantRoom.data()?.status, "vacant");
    assert.equal(formerResidency.data()?.status, "former");
    assert.equal(formerResidency.data()?.depositAppliedToBalance, 6000);
    assert.equal(formerResidency.data()?.depositDeducted, 6000);
    assert.equal(formerResidency.data()?.depositRefunded, 0);
    assert.equal(formerResidency.data()?.finalBalance, 2200);
    assert.equal(formerResidency.data()?.depositSettlementStatus, "settled");
  } finally {
    await Promise.all([
      database.recursiveDelete(propertyReference),
      database.collection("users").doc(userId).delete(),
    ]);
    try {
      await authentication.deleteUser(userId);
    } catch {
      // Cleanup is complete if the user is already absent.
    }
  }
});
