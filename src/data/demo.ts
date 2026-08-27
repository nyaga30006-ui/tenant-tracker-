import type { AppUser, ElectricityBill, MaintenanceIssue, Payment, Property, Room } from "../types/domain";

export const demoProperties: Property[] = [
  {
    id: "property-nyaga",
    landlordId: "admin-1",
    name: "Nyaga Property",
    address: "12 Kirichwa Road",
    city: "Nairobi",
    units: 83,
    occupiedUnits: 64,
    maintenanceUnits: 3,
    monthlyRentTarget: 450000,
    collectedThisMonth: 278300,
    billingResetDay: 10,
    preferredPaymentMethod: "mpesa",
  },
  {
    id: "property-riverside",
    landlordId: "admin-1",
    name: "Riverside Court",
    address: "7 Riverside Drive",
    city: "Nairobi",
    units: 32,
    occupiedUnits: 29,
    maintenanceUnits: 1,
    monthlyRentTarget: 320000,
    collectedThisMonth: 291500,
    billingResetDay: 10,
    preferredPaymentMethod: "bank",
  },
  {
    id: "property-karibu",
    landlordId: "admin-1",
    name: "Karibu Apartments",
    address: "Mombasa Road",
    city: "Machakos",
    units: 18,
    occupiedUnits: 13,
    maintenanceUnits: 0,
    monthlyRentTarget: 162000,
    collectedThisMonth: 127000,
    billingResetDay: 10,
    preferredPaymentMethod: "mpesa",
  },
];

export const demoUsers: AppUser[] = [
  { assignedPropertyIds: [], id: "admin-1", username: "Property Admin", email: "admin@example.com", role: "admin", disabled: false, landlordAccess: "full" },
  { assignedPropertyIds: ["property-nyaga"], id: "caretaker-1", username: "Main Caretaker", email: "caretaker@example.com", role: "caretaker", disabled: false, landlordAccess: "view" },
];

export const demoRooms: Room[] = [
  { id: "r1", number: "Room 01", floor: 0, tenant: "Anne Wanjiku", rent: 6500, paid: 6500, arrears: 0, credit: 0, status: "paid", depositPaid: 6500, depositRequired: 6500, depositDueEnabled: true, electricityFee: 2500, electricityPaid: 0, electricityDueEnabled: false, lastResetMonth: "2026-08" },
  { id: "r2", number: "Room 02", floor: 0, tenant: "David Otieno", rent: 6500, paid: 3500, arrears: 0, credit: 0, status: "partial", depositPaid: 3000, depositRequired: 6500, depositDueEnabled: true, electricityFee: 2500, electricityPaid: 0, electricityDueEnabled: false, lastResetMonth: "2026-08" },
  { id: "r3", number: "Room 03", floor: 0, tenant: "", rent: 7000, paid: 0, arrears: 0, credit: 0, status: "vacant", depositPaid: 0, depositRequired: 7000, depositDueEnabled: false, electricityFee: 2500, electricityPaid: 0, electricityDueEnabled: false, lastResetMonth: "2026-08" },
  { id: "r4", number: "Room 12", floor: 1, tenant: "Mary Njeri", rent: 7500, paid: 0, arrears: 1500, credit: 0, status: "unpaid", depositPaid: 0, depositRequired: 7500, depositDueEnabled: false, electricityFee: 2500, electricityPaid: 2500, electricityDueEnabled: true, lastResetMonth: "2026-08" },
  { id: "r5", number: "Room 21", floor: 2, tenant: "Peter Mwangi", rent: 8000, paid: 8500, arrears: 0, credit: 500, status: "credit", depositPaid: 8000, depositRequired: 8000, depositDueEnabled: true, electricityFee: 2500, electricityPaid: 0, electricityDueEnabled: false, lastResetMonth: "2026-08" },
];

export const demoPayments: Payment[] = [
  { id: "p1", roomId: "r1", tenant: "Anne Wanjiku", amount: 6500, method: "mpesa", provider: "mpesa", status: "confirmed", reference: "QH12MPESA1", receiptNo: "NYG-202608-0044", paymentType: "rent", residency: "current", recordedBy: "caretaker", receivedAt: "2026-08-12T09:15:00+03:00" },
  { id: "p2", roomId: "r2", tenant: "David Otieno", amount: 3500, method: "bank", provider: "kcb", status: "confirmed", reference: "EFT-KCB-8821", receiptNo: "NYG-202608-0043", paymentType: "rent", residency: "current", recordedBy: "caretaker", note: "Part payment", receivedAt: "2026-08-11T14:30:00+03:00" },
  { id: "p3", roomId: "r5", tenant: "Peter Mwangi", amount: 8500, method: "cash", provider: "manual", status: "confirmed", reference: "CASH-001", receiptNo: "NYG-202608-0042", paymentType: "rent", residency: "current", recordedBy: "caretaker", receivedAt: "2026-08-10T11:00:00+03:00" },
  { id: "p4", roomId: "r4", tenant: "Mary Njeri", amount: 2500, method: "bank", provider: "kcb", status: "confirmed", reference: "EFT-KCB-8794", receiptNo: "NYG-202608-0041", paymentType: "electricity", residency: "current", recordedBy: "caretaker", receivedAt: "2026-08-09T08:25:00+03:00" },
  { id: "p5", roomId: "r1", tenant: "Anne Wanjiku", amount: 6500, method: "cash", provider: "manual", status: "confirmed", reference: "CASH-002", receiptNo: "NYG-202608-0040", paymentType: "deposit", residency: "current", recordedBy: "admin", receivedAt: "2026-08-08T15:10:00+03:00" },
  { id: "p6", roomId: "r3", tenant: "Former Tenant", amount: 5000, method: "bank", provider: "kcb", status: "confirmed", reference: "EFT-KCB-8701", receiptNo: "NYG-202608-0039", paymentType: "rent", residency: "former", recordedBy: "caretaker", corrected: true, receivedAt: "2026-08-07T10:05:00+03:00" },
];

export const demoMaintenance: MaintenanceIssue[] = [
  { id: "m1", title: "Repair corridor light", amount: 1200, status: "in-progress", reportedAt: "2026-08-11", category: "maintenance", description: "Intermittent light on first-floor corridor.", priority: "medium", urgency: "soon", assignedTo: "Main Caretaker", reportedBy: "Nyaga Admin", area: "First-floor corridor", location: "Block A" },
  { id: "m2", title: "Replace leaking tap", roomNumber: "Room 12", amount: 850, status: "reported", reportedAt: "2026-08-12", category: "maintenance", description: "Kitchen tap is leaking continuously.", priority: "high", urgency: "urgent", assignedTo: "Plumber", reportedBy: "Main Caretaker", location: "Kitchen" },
  { id: "m3", title: "Replace water pump relay", amount: 6800, status: "completed", reportedAt: "2026-07-28", resolvedAt: "2026-08-02", category: "property_equipment", description: "Borehole pump relay was overheating and tripping.", priority: "critical", urgency: "urgent", quantity: 1, unitCost: 6800, assignedTo: "Kamau Electricals", reportedBy: "Nyaga Admin", area: "Borehole", assetTag: "PUMP-01" },
  { id: "m4", title: "CCTV recorder storage", amount: 4200, status: "reported", reportedAt: "2026-08-06", category: "technology", description: "Upgrade recorder disk to retain at least 30 days of footage.", priority: "medium", urgency: "routine", quantity: 1, unitCost: 4200, assignedTo: "SecureView Kenya", reportedBy: "Nyaga Admin", area: "Security office", assetTag: "CCTV-NVR-01" },
];

export const demoElectricityBills: ElectricityBill[] = [
  { id: "e1", area: "security", month: "2026-08", amount: 3850, status: "paid", dueDate: "2026-08-15", note: "Security lights and gate office", recordedBy: "caretaker" },
  { id: "e2", area: "apartment", month: "2026-08", amount: 12600, status: "unpaid", dueDate: "2026-08-18", note: "Common corridors and stairwells", recordedBy: "admin" },
  { id: "e3", area: "borehole", month: "2026-08", amount: 7200, status: "paid", dueDate: "2026-08-14", note: "Borehole pump consumption", recordedBy: "caretaker" },
  { id: "e4", area: "security", month: "2026-07", amount: 3420, status: "paid", dueDate: "2026-07-15", recordedBy: "admin" },
  { id: "e5", area: "apartment", month: "2026-07", amount: 11850, status: "paid", dueDate: "2026-07-18", recordedBy: "admin" },
  { id: "e6", area: "borehole", month: "2026-07", amount: 6950, status: "paid", dueDate: "2026-07-14", recordedBy: "caretaker" },
];
