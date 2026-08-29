import assert from "node:assert/strict";
import test from "node:test";
import {getApps, initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore} from "firebase-admin/firestore";

test("only an administrator can create a property account", async () => {
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

  const app = getApps()[0] ?? initializeApp({projectId});
  const authentication = getAuth(app);
  const database = getFirestore(app);
  const adminId = "user-account-test-admin";
  const caretakerId = "user-account-test-caretaker";
  const adminEmail = "account-admin@myproperty.test";
  const caretakerEmail = "account-caretaker@myproperty.test";
  const newEmail = "new-caretaker@myproperty.test";
  const password = "AccountTest123!";
  const propertyId = "user-account-test-property";
  let createdUserId = "";

  async function removeAuthUser(idOrEmail: string) {
    try {
      const account = idOrEmail.includes("@") ? await authentication.getUserByEmail(idOrEmail) : await authentication.getUser(idOrEmail);
      await authentication.deleteUser(account.uid);
    } catch {
      // Cleanup is complete if the account is already absent.
    }
  }

  async function signIn(email: string): Promise<string> {
    const response = await fetch(`http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key`, {
      body: JSON.stringify({email, password, returnSecureToken: true}),
      headers: {"content-type": "application/json"},
      method: "POST",
    });
    assert.equal(response.status, 200);
    const token = String((await response.json() as {idToken?: string}).idToken ?? "");
    assert.ok(token);
    return token;
  }

  async function call(token: string, data: Record<string, unknown>) {
    const endpoint = `http://${functionsHost}/${projectId}/africa-south1/createPropertyUser`;
    return fetch(endpoint, {
      body: JSON.stringify({data}),
      headers: {authorization: `Bearer ${token}`, "content-type": "application/json"},
      method: "POST",
    });
  }

  await Promise.all([
    database.collection("users").doc(adminId).delete(),
    database.collection("users").doc(caretakerId).delete(),
    database.collection("properties").doc(propertyId).delete(),
  ]);
  await Promise.all([removeAuthUser(adminId), removeAuthUser(caretakerId), removeAuthUser(newEmail)]);

  try {
    await Promise.all([
      authentication.createUser({uid: adminId, email: adminEmail, password}),
      authentication.createUser({uid: caretakerId, email: caretakerEmail, password}),
      database.collection("users").doc(adminId).set({assignedPropertyIds: [], disabled: false, email: adminEmail, landlordAccess: "full", role: "admin", username: "Account Admin"}),
      database.collection("users").doc(caretakerId).set({assignedPropertyIds: [propertyId], disabled: false, email: caretakerEmail, landlordAccess: "view", role: "caretaker", username: "Existing Caretaker"}),
      database.collection("properties").doc(propertyId).set({name: "Account Test Property"}),
    ]);

    const caretakerResponse = await call(await signIn(caretakerEmail), {
      assignedPropertyIds: [propertyId], email: newEmail, landlordAccess: "view", role: "caretaker", username: "Rejected User",
    });
    assert.equal(caretakerResponse.status, 403);
    await assert.rejects(authentication.getUserByEmail(newEmail));

    const adminResponse = await call(await signIn(adminEmail), {
      assignedPropertyIds: [propertyId], email: newEmail, landlordAccess: "view", role: "caretaker", username: "New Caretaker",
    });
    assert.equal(adminResponse.status, 200, await adminResponse.clone().text());
    const payload = await adminResponse.json() as {result?: {email?: string; passwordSetupLink?: string; uid?: string}};
    createdUserId = String(payload.result?.uid ?? "");
    assert.ok(createdUserId);
    assert.equal(payload.result?.email, newEmail);
    assert.match(String(payload.result?.passwordSetupLink ?? ""), /resetPassword/);
    const profile = await database.collection("users").doc(createdUserId).get();
    assert.equal(profile.data()?.role, "caretaker");
    assert.deepEqual(profile.data()?.assignedPropertyIds, [propertyId]);
    assert.equal(profile.data()?.landlordAccess, "view");
  } finally {
    await Promise.all([
      database.collection("users").doc(adminId).delete(),
      database.collection("users").doc(caretakerId).delete(),
      createdUserId ? database.collection("users").doc(createdUserId).delete() : Promise.resolve(),
      database.collection("properties").doc(propertyId).delete(),
    ]);
    await Promise.all([removeAuthUser(adminId), removeAuthUser(caretakerId), removeAuthUser(newEmail)]);
  }
});
