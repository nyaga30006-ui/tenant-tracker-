import { collection, doc, onSnapshot, setDoc, type DocumentData, type QueryDocumentSnapshot, type Unsubscribe } from "firebase/firestore";
import { getFirebaseDatabase } from "../firebase/app";
import { commitSetsInChunks, type BatchedSet } from "../firebase/firestoreBatch";
import { firestoreDocument } from "../firebase/firestoreData";
import { PROPERTY_SUBCOLLECTIONS, propertyCollectionPath, propertyDocumentPath, propertyWaterSettingsPath, type PropertySubcollection } from "../firebase/firestorePaths";
import type { BillingResetRecord, ElectricityBill, MaintenanceIssue, Payment, Room, TenantResidency, WaterConfiguration, WaterMeter, WaterMeterReading, WaterPurchaseBill, WaterSale } from "../types/domain";

export interface FirebasePropertyData {
  billingResetHistory: BillingResetRecord[];
  electricityBills: ElectricityBill[];
  maintenanceIssues: MaintenanceIssue[];
  payments: Payment[];
  rooms: Room[];
  tenantResidencies: TenantResidency[];
  waterConfiguration: WaterConfiguration | null;
  waterMeterReadings: WaterMeterReading[];
  waterMeters: WaterMeter[];
  waterPurchaseBills: WaterPurchaseBill[];
  waterSales: WaterSale[];
}

export type FirebasePropertyDataKey = keyof FirebasePropertyData;
export type FirebasePropertyDataPatch = Partial<FirebasePropertyData>;

const collectionByKey: Record<Exclude<FirebasePropertyDataKey, "waterConfiguration">, PropertySubcollection> = {
  billingResetHistory: PROPERTY_SUBCOLLECTIONS.billingResets,
  electricityBills: PROPERTY_SUBCOLLECTIONS.electricityBills,
  maintenanceIssues: PROPERTY_SUBCOLLECTIONS.maintenance,
  payments: PROPERTY_SUBCOLLECTIONS.payments,
  rooms: PROPERTY_SUBCOLLECTIONS.rooms,
  tenantResidencies: PROPERTY_SUBCOLLECTIONS.tenantResidencies,
  waterMeterReadings: PROPERTY_SUBCOLLECTIONS.waterMeterReadings,
  waterMeters: PROPERTY_SUBCOLLECTIONS.waterMeters,
  waterPurchaseBills: PROPERTY_SUBCOLLECTIONS.waterPurchaseBills,
  waterSales: PROPERTY_SUBCOLLECTIONS.waterSales,
};

function documents<T extends { id: string }>(snapshots: QueryDocumentSnapshot<DocumentData>[]): T[] {
  return snapshots.map((snapshot) => ({ ...snapshot.data(), id: snapshot.id }) as T);
}

function subscribeCollection<T extends { id: string }>(propertyId: string, name: PropertySubcollection, onValue: (items: T[]) => void, onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(collection(getFirebaseDatabase(), propertyCollectionPath(propertyId, name)), (snapshot) => {
    onValue(documents<T>(snapshot.docs));
  }, onError);
}

function changedDocuments<T extends { id: string }>(propertyId: string, name: PropertySubcollection, current: T[], next: T[]): BatchedSet[] {
  const currentById = new Map(current.map((item) => [item.id, item]));
  return next
    .filter((item) => JSON.stringify(currentById.get(item.id)) !== JSON.stringify(item))
    .map((item) => ({
      data: firestoreDocument(item),
      reference: doc(getFirebaseDatabase(), propertyDocumentPath(propertyId, name, item.id)),
    }));
}

export const propertyDataRepository = {
  subscribe(propertyId: string, onPatch: (patch: FirebasePropertyDataPatch) => void, onError: (error: Error) => void): Unsubscribe {
    const unsubscribes: Unsubscribe[] = [
      subscribeCollection<BillingResetRecord>(propertyId, collectionByKey.billingResetHistory, (billingResetHistory) => onPatch({ billingResetHistory: billingResetHistory.sort((a, b) => String(b.resetAt).localeCompare(String(a.resetAt))) }), onError),
      subscribeCollection<ElectricityBill>(propertyId, collectionByKey.electricityBills, (electricityBills) => onPatch({ electricityBills: electricityBills.sort((a, b) => b.dueDate.localeCompare(a.dueDate)) }), onError),
      subscribeCollection<MaintenanceIssue>(propertyId, collectionByKey.maintenanceIssues, (maintenanceIssues) => onPatch({ maintenanceIssues: maintenanceIssues.sort((a, b) => b.reportedAt.localeCompare(a.reportedAt)) }), onError),
      subscribeCollection<Payment>(propertyId, collectionByKey.payments, (payments) => onPatch({ payments: payments.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)) }), onError),
      subscribeCollection<Room>(propertyId, collectionByKey.rooms, (rooms) => onPatch({ rooms: rooms.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true })) }), onError),
      subscribeCollection<TenantResidency>(propertyId, collectionByKey.tenantResidencies, (tenantResidencies) => onPatch({ tenantResidencies }), onError),
      subscribeCollection<WaterMeterReading>(propertyId, collectionByKey.waterMeterReadings, (waterMeterReadings) => onPatch({ waterMeterReadings: waterMeterReadings.sort((a, b) => b.readingDate.localeCompare(a.readingDate)) }), onError),
      subscribeCollection<WaterMeter>(propertyId, collectionByKey.waterMeters, (waterMeters) => onPatch({ waterMeters: waterMeters.sort((a, b) => a.meterNumber.localeCompare(b.meterNumber, undefined, { numeric: true })) }), onError),
      subscribeCollection<WaterPurchaseBill>(propertyId, collectionByKey.waterPurchaseBills, (waterPurchaseBills) => onPatch({ waterPurchaseBills: waterPurchaseBills.sort((a, b) => b.dueDate.localeCompare(a.dueDate)) }), onError),
      subscribeCollection<WaterSale>(propertyId, collectionByKey.waterSales, (waterSales) => onPatch({ waterSales: waterSales.sort((a, b) => b.saleDate.localeCompare(a.saleDate)) }), onError),
      onSnapshot(doc(getFirebaseDatabase(), propertyWaterSettingsPath(propertyId)), (snapshot) => {
        const data = snapshot.data();
        onPatch({ waterConfiguration: snapshot.exists() && data?.disabled !== true ? data as WaterConfiguration : null });
      }, onError),
    ];
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  },

  async upsertChanged<K extends Exclude<FirebasePropertyDataKey, "waterConfiguration">>(propertyId: string, key: K, current: FirebasePropertyData[K], next: FirebasePropertyData[K]): Promise<void> {
    const currentDocuments = current as Array<{ id: string }>;
    const nextDocuments = next as Array<{ id: string }>;
    const writes = changedDocuments(propertyId, collectionByKey[key], currentDocuments, nextDocuments);
    await commitSetsInChunks(getFirebaseDatabase(), writes);
  },

  saveWaterConfiguration(propertyId: string, configuration: WaterConfiguration | null): Promise<void> {
    const value = configuration ? firestoreDocument(configuration) : firestoreDocument({ disabled: true });
    return setDoc(doc(getFirebaseDatabase(), propertyWaterSettingsPath(propertyId)), value, { merge: false });
  },
};
