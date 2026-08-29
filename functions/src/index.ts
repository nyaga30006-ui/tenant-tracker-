import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, type DocumentReference } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { calculateMonthlyReset, type ResettableRoom } from "./monthlyReset.js";

export { manageTenantResidency } from "./tenantResidency.js";

const firebaseProjectId = process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT;
initializeApp(firebaseProjectId ? { projectId: firebaseProjectId } : undefined);

// Cloud Scheduler is not available in africa-south1. The daily reset runs in
// europe-west1 and accesses the Africa-hosted Firestore database once per day.
const SCHEDULER_REGION = "europe-west1";
const TIME_ZONE = "Africa/Nairobi";
const TRANSACTION_CONCURRENCY = 20;

function nairobiBillingDate(now = new Date()): { day: number; month: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: TIME_ZONE,
    year: "numeric",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return { day: Number(value("day")), month: `${value("year")}-${value("month")}` };
}

export interface BillingDate {
  day: number;
  month: string;
}

async function resetRoom(roomReference: DocumentReference, month: string): Promise<number | null> {
  const database = getFirestore();
  return database.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(roomReference);
    if (!snapshot.exists) return null;
    const result = calculateMonthlyReset(snapshot.data() as ResettableRoom, month);
    if (!result) return null;
    transaction.set(roomReference, {
      ...result.patch,
      bookBalanceDue: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return result.arrearsCarried;
  });
}

async function resetProperty(propertyReference: DocumentReference, month: string): Promise<void> {
  const resetReference = propertyReference.collection("billingResets").doc(month);
  const existingReset = await resetReference.get();
  if (existingReset.data()?.status === "completed") return;

  await resetReference.set({
    attempts: FieldValue.increment(1),
    id: month,
    kind: "automatic",
    month,
    recordedBy: "Firebase Scheduler",
    startedAt: FieldValue.serverTimestamp(),
    status: "running",
  }, { merge: true });

  const rooms = await propertyReference.collection("rooms").get();
  for (let start = 0; start < rooms.docs.length; start += TRANSACTION_CONCURRENCY) {
    await Promise.all(rooms.docs.slice(start, start + TRANSACTION_CONCURRENCY).map((room) => resetRoom(room.ref, month)));
  }

  const completedRooms = await propertyReference.collection("rooms").get();
  const resetRooms = completedRooms.docs.filter((room) => room.data().lastResetMonth === month && String(room.data().tenant ?? "").trim());
  const arrearsCarried = resetRooms.reduce((sum, room) => sum + Math.max(0, Number(room.data().arrears) || 0), 0);
  const roomsProcessed = resetRooms.length;
  const resetAt = new Date().toISOString();

  await resetReference.set({
    arrearsCarried,
    completedAt: FieldValue.serverTimestamp(),
    resetAt,
    roomsProcessed,
    status: "completed",
  }, { merge: true });
}

export async function runBillingResetsForDate(billingDate: BillingDate): Promise<number> {
  const database = getFirestore();
  const properties = await database.collection("properties").where("billingResetDay", "==", billingDate.day).get();
  for (const property of properties.docs) await resetProperty(property.ref, billingDate.month);
  return properties.size;
}

export const runDailyBillingResets = onSchedule({
  maxInstances: 1,
  memory: "256MiB",
  region: SCHEDULER_REGION,
  retryCount: 3,
  schedule: "10 0 * * *",
  timeZone: TIME_ZONE,
  timeoutSeconds: 540,
}, async () => {
  const billingDate = nairobiBillingDate();
  logger.info("Starting scheduled billing resets.", billingDate);
  const properties = await runBillingResetsForDate(billingDate);
  logger.info("Scheduled billing resets completed.", { month: billingDate.month, properties });
});
