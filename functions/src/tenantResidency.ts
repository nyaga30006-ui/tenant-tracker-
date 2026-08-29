import { FieldValue, getFirestore, type DocumentData } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
type OperationalRole = "admin" | "caretaker" | "landlord";

interface AuthorisedProfile {
  role: OperationalRole;
  username: string;
}

function objectValue(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpsError("invalid-argument", "The tenant details are invalid.");
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string, required = true): string {
  const result = typeof value === "string" ? value.trim() : "";
  if (required && !result) throw new HttpsError("invalid-argument", `${label} is required.`);
  return result;
}

function dateText(value: unknown, label: string): string {
  const result = text(value, label);
  if (!ISO_DATE.test(result) || Number.isNaN(Date.parse(`${result}T12:00:00Z`))) throw new HttpsError("invalid-argument", `${label} is invalid.`);
  return result;
}

function amount(value: unknown, label: string, minimum = 0): number {
  const result = Number(value);
  if (!Number.isFinite(result) || result < minimum) throw new HttpsError("invalid-argument", `${label} is invalid.`);
  return result;
}

function recurringBalance(room: DocumentData): number {
  const paid = Number(room.paid) || 0;
  const credit = Number(room.credit) || 0;
  if (typeof room.bookBalanceDue === "number") return room.bookBalanceDue - paid - credit;
  return Math.max(0, (Number(room.rent) || 0) + (Number(room.arrears) || 0) - credit) - paid;
}

async function authorisedProfile(userId: string, propertyId: string): Promise<AuthorisedProfile> {
  const snapshot = await getFirestore().collection("users").doc(userId).get();
  const data = snapshot.data();
  if (!snapshot.exists || !data || data.disabled === true) throw new HttpsError("permission-denied", "This user account is unavailable.");
  const role = data.role as OperationalRole;
  const allowed = role === "admin" || role === "caretaker" || (role === "landlord" && data.landlordAccess === "full");
  if (!allowed) throw new HttpsError("permission-denied", "Your account cannot move tenants.");
  if (role !== "admin" && (!Array.isArray(data.assignedPropertyIds) || !data.assignedPropertyIds.includes(propertyId))) throw new HttpsError("permission-denied", "This property is not assigned to your account.");
  return { role, username: text(data.username, "User name") };
}

async function moveIn(propertyId: string, profile: AuthorisedProfile, payload: Record<string, unknown>): Promise<void> {
  const residencyInput = objectValue(payload.residency);
  const roomInput = objectValue(payload.room);
  const roomId = text(roomInput.id, "Room");
  const residencyId = text(residencyInput.id, "Residency");
  const tenantName = text(residencyInput.tenantName, "Tenant name");
  const tenantPhone = text(residencyInput.tenantPhone, "Tenant phone", false);
  const moveInDate = dateText(residencyInput.moveInDate, "Move-in date");
  const moveInNote = text(residencyInput.moveInNote, "Move-in note", false);
  const database = getFirestore();
  const propertyReference = database.collection("properties").doc(propertyId);
  const roomReference = propertyReference.collection("rooms").doc(roomId);
  const residencyReference = propertyReference.collection("tenantResidencies").doc(residencyId);

  await database.runTransaction(async (transaction) => {
    const [propertySnapshot, roomSnapshot, existingResidency] = await Promise.all([
      transaction.get(propertyReference), transaction.get(roomReference), transaction.get(residencyReference),
    ]);
    if (!propertySnapshot.exists || !roomSnapshot.exists) throw new HttpsError("not-found", "The property or room no longer exists.");
    if (existingResidency.exists) throw new HttpsError("already-exists", "This tenant residency already exists.");
    const currentRoom = roomSnapshot.data() ?? {};
    if (String(currentRoom.tenant ?? "").trim()) throw new HttpsError("failed-precondition", "The room is already occupied.");
    const rent = amount(roomInput.rent, "Monthly rent", 1);
    const depositRequired = amount(roomInput.depositRequired, "Deposit required");
    const depositHeld = amount(residencyInput.depositHeld, "Deposit held");
    if (depositHeld > depositRequired) throw new HttpsError("invalid-argument", "Deposit held cannot exceed the required deposit.");
    const electricityDueEnabled = roomInput.electricityDueEnabled === true;
    const resetDay = Number(propertySnapshot.data()?.billingResetDay) || 1;
    const moveInDay = Number(moveInDate.slice(8, 10));

    transaction.create(residencyReference, {
      depositHeld,
      moveInDate,
      ...(moveInNote ? { moveInNote } : {}),
      movedInBy: profile.username,
      roomId,
      status: "active",
      tenantName,
      ...(tenantPhone ? { tenantPhone } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.set(roomReference, {
      activeResidencyId: residencyId,
      arrears: 0,
      bookBalanceDue: FieldValue.delete(),
      bookNote: FieldValue.delete(),
      bookSetAt: FieldValue.delete(),
      bookSetBy: FieldValue.delete(),
      credit: 0,
      depositDueEnabled: depositRequired > 0,
      depositPaid: depositHeld,
      depositRequired,
      electricityDueEnabled,
      electricityFee: Number(currentRoom.electricityFee) || 2500,
      electricityPaid: 0,
      lastResetMonth: moveInDay > resetDay ? moveInDate.slice(0, 7) : FieldValue.delete(),
      paid: 0,
      rent,
      status: "unpaid",
      tenant: tenantName,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
}

async function moveOut(propertyId: string, profile: AuthorisedProfile, payload: Record<string, unknown>): Promise<void> {
  const residencyInput = objectValue(payload.residency);
  const roomInput = objectValue(payload.room);
  const roomId = text(roomInput.id, "Room");
  const residencyId = text(residencyInput.id, "Residency");
  const moveOutDate = dateText(residencyInput.moveOutDate, "Move-out date");
  const moveOutNote = text(residencyInput.moveOutNote, "Move-out note", false);
  const database = getFirestore();
  const propertyReference = database.collection("properties").doc(propertyId);
  const roomReference = propertyReference.collection("rooms").doc(roomId);
  const residencyReference = propertyReference.collection("tenantResidencies").doc(residencyId);

  await database.runTransaction(async (transaction) => {
    const [roomSnapshot, residencySnapshot, paymentSnapshots] = await Promise.all([
      transaction.get(roomReference),
      transaction.get(residencyReference),
      transaction.get(propertyReference.collection("payments").where("roomId", "==", roomId)),
    ]);
    if (!roomSnapshot.exists || !residencySnapshot.exists) throw new HttpsError("not-found", "The room or tenant residency no longer exists.");
    const currentRoom = roomSnapshot.data() ?? {};
    const currentResidency = residencySnapshot.data() ?? {};
    if (currentRoom.activeResidencyId !== residencyId || currentResidency.status !== "active") throw new HttpsError("failed-precondition", "This is no longer the room's active tenant.");
    if (moveOutDate < String(currentResidency.moveInDate ?? "")) throw new HttpsError("invalid-argument", "Move-out date cannot be before move-in date.");
    const depositHeld = Number(currentRoom.depositPaid ?? currentResidency.depositHeld) || 0;
    const balance = recurringBalance(currentRoom);
    const depositAppliedToBalance = amount(residencyInput.depositAppliedToBalance, "Deposit applied to balance");
    const depositDeducted = amount(residencyInput.depositDeducted, "Deposit deducted");
    const depositRefunded = amount(residencyInput.depositRefunded, "Deposit refunded");
    const finalBalance = Number(residencyInput.finalBalance);
    const deductionNote = text(residencyInput.deductionNote, "Deduction explanation", false);
    const maximumBalanceApplication = Math.min(depositHeld, Math.max(0, balance));
    if (!Number.isFinite(finalBalance) || depositAppliedToBalance > maximumBalanceApplication || depositDeducted < depositAppliedToBalance || depositDeducted > depositHeld) throw new HttpsError("invalid-argument", "Deposit settlement is invalid.");
    if (depositDeducted > 0 && !deductionNote) throw new HttpsError("invalid-argument", "Explain the deposit deduction.");
    if (Math.abs(depositRefunded - (depositHeld - depositDeducted)) > 0.01 || Math.abs(finalBalance - (balance - depositAppliedToBalance)) > 0.01) throw new HttpsError("invalid-argument", "The deposit settlement totals do not match.");
    const formerPayments = paymentSnapshots.docs.filter((payment) => {
      const value = payment.data();
      return value.residencyId === residencyId || (!value.residencyId && (value.residency ?? "current") === "current");
    });
    if (formerPayments.length > 450) throw new HttpsError("resource-exhausted", "This residency has too many payments to archive in one operation.");

    transaction.set(residencyReference, {
      deductionNote: deductionNote || FieldValue.delete(),
      depositAppliedToBalance,
      depositDeducted,
      depositHeld,
      depositRefunded,
      depositSettlementStatus: "settled",
      finalBalance,
      moveOutDate,
      moveOutNote: moveOutNote || FieldValue.delete(),
      movedOutBy: profile.username,
      status: "former",
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.set(roomReference, {
      activeResidencyId: FieldValue.delete(),
      arrears: 0,
      bookBalanceDue: FieldValue.delete(),
      bookNote: FieldValue.delete(),
      bookSetAt: FieldValue.delete(),
      bookSetBy: FieldValue.delete(),
      credit: 0,
      depositDueEnabled: false,
      depositPaid: 0,
      depositRequired: Number(currentRoom.rent) || 0,
      electricityDueEnabled: false,
      electricityPaid: 0,
      lastResetMonth: FieldValue.delete(),
      paid: 0,
      status: "vacant",
      tenant: "",
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    for (const payment of formerPayments) transaction.update(payment.ref, { residency: "former", residencyId, updatedAt: FieldValue.serverTimestamp() });
  });
}

export const manageTenantResidency = onCall({ maxInstances: 1, memory: "256MiB", region: "africa-south1" }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before moving a tenant.");
  const payload = objectValue(request.data);
  const propertyId = text(payload.propertyId, "Property");
  const profile = await authorisedProfile(request.auth.uid, propertyId);
  if (payload.action === "moveIn") await moveIn(propertyId, profile, payload);
  else if (payload.action === "moveOut") await moveOut(propertyId, profile, payload);
  else throw new HttpsError("invalid-argument", "Unknown tenant action.");
  return { ok: true };
});
