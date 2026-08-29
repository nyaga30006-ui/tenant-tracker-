import {randomBytes} from "node:crypto";
import {getAuth} from "firebase-admin/auth";
import {getFirestore} from "firebase-admin/firestore";
import {HttpsError, onCall} from "firebase-functions/v2/https";

const MAX_LANDLORDS = 5;
const REGION = "africa-south1";
const LIVE_APP_URL = "https://myproperty-7a932.web.app/";

function objectValue(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpsError("invalid-argument", "The user details are invalid.");
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string): string {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result) throw new HttpsError("invalid-argument", `${label} is required.`);
  return result;
}

function assignedProperties(value: unknown): string[] {
  if (!Array.isArray(value)) throw new HttpsError("invalid-argument", "Choose at least one property.");
  const ids = [...new Set(value.map((item) => typeof item === "string" ? item.trim() : "").filter(Boolean))];
  if (!ids.length || ids.some((id) => id.includes("/"))) throw new HttpsError("invalid-argument", "Choose valid property assignments.");
  return ids;
}

async function assertAdministrator(userId: string): Promise<void> {
  const profile = await getFirestore().collection("users").doc(userId).get();
  if (!profile.exists || profile.data()?.disabled === true || profile.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Only an active administrator can create accounts.");
  }
}

async function assertPropertiesExist(propertyIds: string[]): Promise<void> {
  const database = getFirestore();
  const snapshots = await database.getAll(...propertyIds.map((id) => database.collection("properties").doc(id)));
  const missing = snapshots.filter((snapshot) => !snapshot.exists).map((snapshot) => snapshot.id);
  if (missing.length) throw new HttpsError("failed-precondition", `Unknown property assignment: ${missing.join(", ")}`);
}

async function assertLandlordCapacity(): Promise<void> {
  const landlords = await getFirestore().collection("users").where("role", "==", "landlord").get();
  const active = landlords.docs.filter((document) => document.data().disabled !== true).length;
  if (active >= MAX_LANDLORDS) throw new HttpsError("resource-exhausted", `The ${MAX_LANDLORDS}-landlord limit has been reached.`);
}

export const createPropertyUser = onCall({maxInstances: 1, memory: "256MiB", region: REGION}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before creating an account.");
  await assertAdministrator(request.auth.uid);
  const input = objectValue(request.data);
  const username = text(input.username, "Full name");
  const email = text(input.email, "Email address").toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpsError("invalid-argument", "Enter a valid email address.");
  const role = input.role === "caretaker" ? "caretaker" : input.role === "landlord" ? "landlord" : null;
  if (!role) throw new HttpsError("invalid-argument", "Only landlord and caretaker accounts can be created here.");
  const assignedPropertyIds = assignedProperties(input.assignedPropertyIds);
  await assertPropertiesExist(assignedPropertyIds);
  if (role === "landlord") await assertLandlordCapacity();

  const authentication = getAuth();
  let userId = "";
  try {
    const account = await authentication.createUser({
      displayName: username,
      email,
      emailVerified: false,
      password: `${randomBytes(24).toString("base64url")}aA1!`,
    });
    userId = account.uid;
    const passwordSetupLink = await authentication.generatePasswordResetLink(email, {url: LIVE_APP_URL});
    await getFirestore().collection("users").doc(userId).create({
      assignedPropertyIds,
      disabled: false,
      email,
      landlordAccess: "view",
      role,
      username,
    });
    return {email, passwordSetupLink, uid: userId};
  } catch (error) {
    if (userId) await authentication.deleteUser(userId).catch(() => undefined);
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (code.includes("email-already-exists")) throw new HttpsError("already-exists", "An authentication account already uses this email address.");
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "The Firebase account could not be created.");
  }
});
