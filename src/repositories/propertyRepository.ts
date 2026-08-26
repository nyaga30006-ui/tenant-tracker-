import { collection, doc, onSnapshot, setDoc, type DocumentData, type DocumentSnapshot, type QueryDocumentSnapshot, type Unsubscribe } from "firebase/firestore";
import { getFirebaseDatabase } from "../firebase/app";
import { commitSetsInChunks } from "../firebase/firestoreBatch";
import { finiteNumber, firestoreDocument } from "../firebase/firestoreData";
import { FIRESTORE_COLLECTIONS, PROPERTY_SUBCOLLECTIONS, propertyDocumentPath, propertyPath } from "../firebase/firestorePaths";
import { normaliseBillingResetDay } from "../lib/billingSchedule";
import { normalisePreferredPaymentMethod } from "../lib/paymentPreferences";
import type { AppUser, Property, Room } from "../types/domain";

function fromPropertySnapshot(snapshot: DocumentSnapshot<DocumentData> | QueryDocumentSnapshot<DocumentData>): Property {
  const data = snapshot.data() ?? {};
  return {
    id: snapshot.id,
    landlordId: String(data.landlordId ?? ""),
    name: String(data.name ?? "Property"),
    address: String(data.address ?? ""),
    city: String(data.city ?? ""),
    units: finiteNumber(data.units),
    occupiedUnits: finiteNumber(data.occupiedUnits),
    maintenanceUnits: finiteNumber(data.maintenanceUnits),
    monthlyRentTarget: finiteNumber(data.monthlyRentTarget),
    collectedThisMonth: finiteNumber(data.collectedThisMonth),
    billingResetDay: normaliseBillingResetDay(data.billingResetDay),
    preferredPaymentMethod: normalisePreferredPaymentMethod(data.preferredPaymentMethod),
  };
}

function orderedProperties(properties: Iterable<Property>): Property[] {
  return [...properties].sort((a, b) => a.name.localeCompare(b.name));
}

function subscribeAssigned(propertyIds: string[], onProperties: (properties: Property[]) => void, onError: (error: Error) => void): Unsubscribe {
  const uniqueIds = [...new Set(propertyIds.filter(Boolean))];
  const properties = new Map<string, Property>();
  if (!uniqueIds.length) {
    onProperties([]);
    return () => undefined;
  }
  const unsubscribes = uniqueIds.map((propertyId) => onSnapshot(doc(getFirebaseDatabase(), propertyPath(propertyId)), (snapshot) => {
    if (snapshot.exists()) properties.set(propertyId, fromPropertySnapshot(snapshot));
    else properties.delete(propertyId);
    onProperties(orderedProperties(properties.values()));
  }, onError));
  return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
}

export const propertyRepository = {
  subscribeForUser(user: AppUser, onProperties: (properties: Property[]) => void, onError: (error: Error) => void): Unsubscribe {
    if (user.role !== "admin") return subscribeAssigned(user.assignedPropertyIds, onProperties, onError);
    return onSnapshot(collection(getFirebaseDatabase(), FIRESTORE_COLLECTIONS.properties), (snapshot) => {
      onProperties(orderedProperties(snapshot.docs.map(fromPropertySnapshot)));
    }, onError);
  },

  async create(property: Property, rooms: Room[]): Promise<void> {
    const database = getFirebaseDatabase();
    const propertyReference = doc(database, propertyPath(property.id));
    await setDoc(propertyReference, firestoreDocument({ ...property, provisioningState: "creating", schemaVersion: 2 }), { merge: false });
    await commitSetsInChunks(database, rooms.map((room) => ({
      data: firestoreDocument(room),
      reference: doc(database, propertyDocumentPath(property.id, PROPERTY_SUBCOLLECTIONS.rooms, room.id)),
    })));
    await setDoc(propertyReference, firestoreDocument({ provisioningState: "ready", roomCount: rooms.length }), { merge: true });
  },

  save(property: Property): Promise<void> {
    return setDoc(doc(getFirebaseDatabase(), propertyPath(property.id)), firestoreDocument({ ...property, schemaVersion: 2 }), { merge: true });
  },
};
