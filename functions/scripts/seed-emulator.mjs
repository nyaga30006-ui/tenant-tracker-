import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? "demo-myproperty";
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";

function isLocalEmulator(host) {
  return /^(127\.0\.0\.1|localhost):\d+$/.test(host);
}

if (!projectId.startsWith("demo-") || !isLocalEmulator(authHost) || !isLocalEmulator(firestoreHost)) {
  throw new Error("Refusing to seed: a demo- project and local Auth/Firestore emulators are required.");
}

process.env.GCLOUD_PROJECT = projectId;
process.env.FIREBASE_AUTH_EMULATOR_HOST = authHost;
process.env.FIRESTORE_EMULATOR_HOST = firestoreHost;

const app = getApps()[0] ?? initializeApp({ projectId });
const authentication = getAuth(app);
const database = getFirestore(app);

const accounts = [
  { uid: "demo-admin", email: "admin@myproperty.test", password: "DemoAdmin123!", displayName: "Demo Admin" },
  { uid: "demo-caretaker", email: "caretaker@myproperty.test", password: "DemoCare123!", displayName: "Demo Caretaker" },
  { uid: "demo-landlord-view", email: "landlord-view@myproperty.test", password: "DemoView123!", displayName: "View Landlord" },
  { uid: "demo-landlord-full", email: "landlord-full@myproperty.test", password: "DemoFull123!", displayName: "Full Landlord" },
];

for (const account of accounts) {
  try {
    await authentication.createUser(account);
  } catch (error) {
    if (error?.code !== "auth/uid-already-exists") throw error;
    await authentication.updateUser(account.uid, account);
  }
}

const now = "2026-08-22T09:00:00+03:00";
const users = {
  "demo-admin": { assignedPropertyIds: [], disabled: false, email: accounts[0].email, landlordAccess: "full", role: "admin", username: "Demo Admin" },
  "demo-caretaker": { assignedPropertyIds: ["nyaga-property"], disabled: false, email: accounts[1].email, landlordAccess: "view", role: "caretaker", username: "Demo Caretaker" },
  "demo-landlord-view": { assignedPropertyIds: ["nyaga-property"], disabled: false, email: accounts[2].email, landlordAccess: "view", role: "landlord", username: "View Landlord" },
  "demo-landlord-full": { assignedPropertyIds: ["riverside-property"], disabled: false, email: accounts[3].email, landlordAccess: "full", role: "landlord", username: "Full Landlord" },
};

const properties = {
  "nyaga-property": {
    address: "Kitengela",
    billingResetDay: 10,
    city: "Kajiado",
    collectedThisMonth: 15500,
    landlordId: "demo-landlord-view",
    maintenanceUnits: 1,
    monthlyRentTarget: 30000,
    name: "Nyaga Property",
    occupiedUnits: 3,
    preferredPaymentMethod: "bank",
    provisioningState: "ready",
    roomCount: 4,
    schemaVersion: 2,
    units: 4,
  },
  "riverside-property": {
    address: "River Road",
    billingResetDay: 5,
    city: "Nairobi",
    collectedThisMonth: 8000,
    landlordId: "demo-landlord-full",
    maintenanceUnits: 0,
    monthlyRentTarget: 16000,
    name: "Riverside Apartments",
    occupiedUnits: 1,
    preferredPaymentMethod: "mpesa",
    provisioningState: "ready",
    roomCount: 2,
    schemaVersion: 2,
    units: 2,
  },
};

const nyagaRooms = [
  { id: "room-01", activeResidencyId: "residency-01", number: "01", floor: 0, tenant: "Alice Mwangi", rent: 7500, paid: 7500, arrears: 0, credit: 0, status: "paid", depositPaid: 7500, depositRequired: 7500, depositDueEnabled: true, electricityFee: 2500, electricityDueEnabled: false },
  { id: "room-02", activeResidencyId: "residency-02", number: "02", floor: 0, tenant: "Brian Otieno", rent: 8000, paid: 4000, arrears: 0, credit: 0, status: "partial", depositPaid: 0, depositRequired: 8000, depositDueEnabled: false, electricityFee: 2500, electricityDueEnabled: false },
  { id: "room-03", activeResidencyId: "residency-03", number: "03", floor: 1, tenant: "Carol Wanjiku", rent: 7500, paid: 0, arrears: 7500, credit: 0, status: "unpaid", depositPaid: 5000, depositRequired: 7500, depositDueEnabled: true, electricityFee: 2500, electricityDueEnabled: true },
  { id: "room-04", number: "04", floor: 1, tenant: "", rent: 7000, paid: 0, arrears: 0, credit: 0, status: "vacant", depositPaid: 0, depositRequired: 7000, depositDueEnabled: false, electricityFee: 2500, electricityDueEnabled: false },
];

const riversideRooms = [
  { id: "room-a", activeResidencyId: "residency-a", number: "A", floor: 0, tenant: "David Kamau", rent: 8000, paid: 8000, arrears: 0, credit: 500, status: "credit", depositPaid: 8000, depositRequired: 8000, depositDueEnabled: true, electricityFee: 2500, electricityDueEnabled: false },
  { id: "room-b", number: "B", floor: 0, tenant: "", rent: 8000, paid: 0, arrears: 0, credit: 0, status: "vacant", depositPaid: 0, depositRequired: 8000, depositDueEnabled: false, electricityFee: 2500, electricityDueEnabled: false },
];

await Promise.all([
  ...Object.entries(users).map(([id, data]) => database.collection("users").doc(id).set(data)),
  ...Object.entries(properties).map(([id, data]) => database.collection("properties").doc(id).set(data)),
  ...nyagaRooms.map(({ id, ...data }) => database.collection("properties").doc("nyaga-property").collection("rooms").doc(id).set(data)),
  ...riversideRooms.map(({ id, ...data }) => database.collection("properties").doc("riverside-property").collection("rooms").doc(id).set(data)),
  database.doc("properties/nyaga-property/tenantResidencies/residency-01").set({ depositHeld: 7500, id: "residency-01", moveInDate: "2026-01-01", movedInBy: "Demo Admin", roomId: "room-01", status: "active", tenantName: "Alice Mwangi" }),
  database.doc("properties/nyaga-property/tenantResidencies/residency-02").set({ depositHeld: 0, id: "residency-02", moveInDate: "2026-02-01", movedInBy: "Demo Admin", roomId: "room-02", status: "active", tenantName: "Brian Otieno" }),
  database.doc("properties/nyaga-property/tenantResidencies/residency-03").set({ depositHeld: 5000, id: "residency-03", moveInDate: "2026-03-01", movedInBy: "Demo Admin", roomId: "room-03", status: "active", tenantName: "Carol Wanjiku" }),
  database.doc("properties/riverside-property/tenantResidencies/residency-a").set({ depositHeld: 8000, id: "residency-a", moveInDate: "2026-04-01", movedInBy: "Demo Admin", roomId: "room-a", status: "active", tenantName: "David Kamau" }),
]);

await Promise.all([
  database.doc("properties/nyaga-property/payments/demo-payment-bank").set({ id: "demo-payment-bank", roomId: "room-01", tenant: "Alice Mwangi", amount: 7500, method: "bank", provider: "kcb", status: "confirmed", reference: "KCB-DEMO-001", referenceKey: "KCB-DEMO-001", receivedAt: now, rawDate: "2026-08-22", paymentType: "rent", residency: "current", residencyId: "residency-01", recordedBy: "Demo Admin", receiptNo: "NYG-202608-0001" }),
  database.doc("properties/nyaga-property/paymentReferences/KCB-DEMO-001").set({ paymentId: "demo-payment-bank", reference: "KCB-DEMO-001" }),
  database.doc("properties/nyaga-property/maintenance/demo-maintenance").set({ id: "demo-maintenance", title: "Repair corridor light", amount: 2500, status: "reported", reportedAt: now, category: "maintenance", priority: "medium", reportedBy: "Demo Caretaker" }),
  database.doc("properties/nyaga-property/electricityBills/demo-electricity").set({ id: "demo-electricity", area: "borehole", month: "2026-08", amount: 12000, status: "unpaid", dueDate: "2026-08-30", recordedBy: "Demo Admin" }),
  database.doc("properties/nyaga-property/settings/water").set({ configuredAt: now, defaultRatePerM3: 120, mode: "seller", serviceName: "Nyaga Meter Sales" }),
  database.doc("properties/nyaga-property/waterMeters/demo-meter").set({ customerName: "Sunrise Apartments", digitCount: 6, meterNumber: "NYG-M01", openingReadingM3: 12340, registeredAt: now, status: "active" }),
  database.doc("properties/nyaga-property/waterMeterReadings/demo-reading").set({ amountDue: 5400, amountPaid: 3000, billingMonth: "2026-08", consumptionM3: 45, currentReadingM3: 12385, id: "demo-reading", meterId: "demo-meter", previousReadingM3: 12340, ratePerM3: 120, readingDate: "2026-08-22" }),
  database.doc("properties/riverside-property/settings/water").set({ configuredAt: now, defaultSupplier: "County Water", mode: "buyer", serviceName: "Apartment Water Bills" }),
  database.doc("properties/riverside-property/waterPurchaseBills/demo-water-bill").set({ amount: 9000, dueDate: "2026-08-28", id: "demo-water-bill", month: "2026-08", status: "unpaid", supplier: "County Water", volumeM3: 70 }),
]);

console.log("Firebase emulator demo data is ready.");
console.log("Admin: admin@myproperty.test / DemoAdmin123!");
console.log("Caretaker: caretaker@myproperty.test / DemoCare123!");
console.log("View landlord: landlord-view@myproperty.test / DemoView123!");
console.log("Full landlord: landlord-full@myproperty.test / DemoFull123!");
