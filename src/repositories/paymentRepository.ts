import { collection, doc, onSnapshot, runTransaction, type DocumentData, type QueryDocumentSnapshot, type Unsubscribe } from "firebase/firestore";
import { getFirebaseDatabase } from "../firebase/app";
import { finiteNumber, firestoreDocument, optionalString } from "../firebase/firestoreData";
import { PROPERTY_SUBCOLLECTIONS, propertyCollectionPath, propertyDocumentPath } from "../firebase/firestorePaths";
import { normalisedReference } from "../lib/validation";
import type { Payment, PaymentMethod, PaymentProvider, PaymentStatus, PaymentType, Room, TenantResidency } from "../types/domain";

const paymentMethods: PaymentMethod[] = ["cash", "mpesa", "bank"];
const paymentTypes: PaymentType[] = ["rent", "electricity", "deposit"];
const paymentStatuses: PaymentStatus[] = ["pending", "confirmed", "failed"];

function methodValue(value: unknown): PaymentMethod {
  return paymentMethods.includes(value as PaymentMethod) ? value as PaymentMethod : "cash";
}

function providerValue(method: PaymentMethod): PaymentProvider {
  if (method === "mpesa") return "mpesa";
  if (method === "bank") return "kcb";
  return "manual";
}

function receivedAtValue(data: DocumentData): string {
  if (typeof data.receivedAt === "string") return data.receivedAt;
  if (typeof data.rawDate === "string" && data.rawDate) return `${data.rawDate}T12:00:00+03:00`;
  if (data.receivedAt?.toDate instanceof Function) return data.receivedAt.toDate().toISOString();
  if (typeof data.ts === "number") return new Date(data.ts).toISOString();
  return new Date().toISOString();
}

function fromPaymentDocument(snapshot: QueryDocumentSnapshot<DocumentData>): Payment {
  const data = snapshot.data();
  const method = methodValue(data.method);
  return {
    id: snapshot.id,
    roomId: String(data.roomId ?? ""),
    tenant: String(data.tenant ?? ""),
    amount: finiteNumber(data.amount),
    method,
    provider: data.provider === "mpesa" || data.provider === "kcb" || data.provider === "manual" ? data.provider : providerValue(method),
    status: paymentStatuses.includes(data.status as PaymentStatus) ? data.status as PaymentStatus : "confirmed",
    reference: String(data.reference ?? data.refNumber ?? data.mpesaCode ?? ""),
    receivedAt: receivedAtValue(data),
    receiptNo: optionalString(data.receiptNo ?? data.serial),
    paymentType: paymentTypes.includes(data.paymentType as PaymentType) ? data.paymentType as PaymentType : "rent",
    residency: data.residency === "former" ? "former" : "current",
    residencyId: optionalString(data.residencyId),
    recordedBy: optionalString(data.recordedBy ?? data.by),
    note: optionalString(data.note),
    corrected: data.corrected === true,
  };
}

function paymentDocument(payment: Payment, room?: Room, referenceKey = "") {
  const rawDate = payment.receivedAt.slice(0, 10);
  const displayDate = new Date(`${rawDate}T12:00:00`).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
  return firestoreDocument({
    ...payment,
    by: payment.recordedBy ?? "",
    date: displayDate,
    monthKey: rawDate.slice(0, 7),
    mpesaCode: payment.method === "mpesa" ? payment.reference : "",
    rawDate,
    refNumber: payment.reference,
    referenceKey,
    roomNumber: room?.number ?? "",
    serial: payment.receiptNo ?? "",
    ts: new Date(payment.receivedAt).getTime(),
  });
}

export const paymentRepository = {
  subscribe(propertyId: string, onPayments: (payments: Payment[]) => void, onError: (error: Error) => void): Unsubscribe {
    return onSnapshot(collection(getFirebaseDatabase(), propertyCollectionPath(propertyId, PROPERTY_SUBCOLLECTIONS.payments)), (snapshot) => {
      const payments = snapshot.docs.map(fromPaymentDocument).sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
      onPayments(payments);
    }, onError);
  },

  save(propertyId: string, payment: Payment, roomAfterPayment?: Room, residencyAfterPayment?: TenantResidency): Promise<void> {
    const database = getFirebaseDatabase();
    return runTransaction(database, async (transaction) => {
      const referenceKey = payment.method === "cash" ? "" : encodeURIComponent(normalisedReference(payment.reference));
      const referenceDocument = referenceKey
        ? doc(database, propertyDocumentPath(propertyId, PROPERTY_SUBCOLLECTIONS.paymentReferences, referenceKey))
        : null;
      if (referenceDocument) {
        const existingReference = await transaction.get(referenceDocument);
        if (existingReference.exists()) throw new Error(`Payment reference ${payment.reference} already exists.`);
      }
      transaction.set(doc(database, propertyDocumentPath(propertyId, PROPERTY_SUBCOLLECTIONS.payments, payment.id)), paymentDocument(payment, roomAfterPayment, referenceKey));
      if (roomAfterPayment) transaction.set(doc(database, propertyDocumentPath(propertyId, PROPERTY_SUBCOLLECTIONS.rooms, roomAfterPayment.id)), firestoreDocument(roomAfterPayment));
      if (residencyAfterPayment) transaction.set(doc(database, propertyDocumentPath(propertyId, PROPERTY_SUBCOLLECTIONS.tenantResidencies, residencyAfterPayment.id)), firestoreDocument(residencyAfterPayment));
      if (referenceDocument) transaction.set(referenceDocument, firestoreDocument({ paymentId: payment.id, reference: normalisedReference(payment.reference) }));
    });
  },
};
