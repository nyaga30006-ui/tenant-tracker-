export const FIRESTORE_COLLECTIONS = {
  properties: "properties",
  users: "users",
} as const;

export const PROPERTY_SUBCOLLECTIONS = {
  billingResets: "billingResets",
  electricityBills: "electricityBills",
  maintenance: "maintenance",
  notificationState: "notificationState",
  payments: "payments",
  paymentReferences: "paymentReferences",
  rooms: "rooms",
  tenantResidencies: "tenantResidencies",
  waterMeterReadings: "waterMeterReadings",
  waterMeters: "waterMeters",
  waterPurchaseBills: "waterPurchaseBills",
  waterSales: "waterSales",
} as const;

export type PropertySubcollection = typeof PROPERTY_SUBCOLLECTIONS[keyof typeof PROPERTY_SUBCOLLECTIONS];

export function propertyPath(propertyId: string): string {
  return `${FIRESTORE_COLLECTIONS.properties}/${propertyId}`;
}

export function propertyCollectionPath(propertyId: string, collectionName: PropertySubcollection): string {
  return `${propertyPath(propertyId)}/${collectionName}`;
}

export function propertyDocumentPath(propertyId: string, collectionName: PropertySubcollection, documentId: string): string {
  return `${propertyCollectionPath(propertyId, collectionName)}/${documentId}`;
}

export function propertyWaterSettingsPath(propertyId: string): string {
  return `${propertyPath(propertyId)}/settings/water`;
}

export function userPath(userId: string): string {
  return `${FIRESTORE_COLLECTIONS.users}/${userId}`;
}
