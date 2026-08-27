export type UserRole = "admin" | "landlord" | "caretaker";
export type LandlordAccessMode = "view" | "full";

export interface Property {
  id: string;
  landlordId: string;
  name: string;
  address: string;
  city: string;
  units: number;
  occupiedUnits: number;
  maintenanceUnits: number;
  monthlyRentTarget: number;
  collectedThisMonth: number;
  billingResetDay: number;
  preferredPaymentMethod: PaymentMethod;
}

export interface AppUser {
  assignedPropertyIds: string[];
  id: string;
  username: string;
  email: string;
  role: UserRole;
  disabled: boolean;
  landlordAccess: LandlordAccessMode;
  landlordAccessRequest?: LandlordAccessMode;
}

export type RoomStatus = "vacant" | "paid" | "partial" | "unpaid" | "credit";

export interface Room {
  activeResidencyId?: string;
  id: string;
  number: string;
  floor: number;
  tenant: string;
  rent: number;
  paid: number;
  arrears: number;
  credit: number;
  status: RoomStatus;
  depositPaid?: number;
  depositRequired?: number;
  depositDueEnabled?: boolean;
  electricityFee?: number;
  electricityPaid?: number;
  electricityDueEnabled?: boolean;
  lastResetMonth?: string;
  bookSetAt?: string;
  bookSetBy?: string;
  bookNote?: string;
  bookBalanceDue?: number;
}

export type PaymentProvider = "manual" | "mpesa" | "kcb";
export type PaymentMethod = "cash" | "mpesa" | "bank";
export type PaymentStatus = "pending" | "confirmed" | "failed";
export type PaymentType = "rent" | "electricity" | "deposit";
export type ResidencyStatus = "current" | "former";

export interface Payment {
  id: string;
  roomId: string;
  tenant: string;
  amount: number;
  method: PaymentMethod;
  provider: PaymentProvider;
  status: PaymentStatus;
  reference: string;
  receivedAt: string;
  receiptNo?: string;
  paymentType?: PaymentType;
  residency?: ResidencyStatus;
  residencyId?: string;
  recordedBy?: string;
  note?: string;
  corrected?: boolean;
}

export interface TenantResidency {
  deductionNote?: string;
  depositAppliedToBalance?: number;
  depositDeducted?: number;
  depositHeld: number;
  depositRefunded?: number;
  depositSettlementStatus?: "pending" | "settled";
  finalBalance?: number;
  id: string;
  moveInDate: string;
  moveInNote?: string;
  moveOutDate?: string;
  moveOutNote?: string;
  movedInBy: string;
  movedOutBy?: string;
  roomId: string;
  status: "active" | "former";
  tenantName: string;
  tenantPhone?: string;
}

export type MaintenanceStatus = "reported" | "in-progress" | "completed";

export interface MaintenanceIssue {
  id: string;
  title: string;
  roomNumber?: string;
  amount: number;
  status: MaintenanceStatus;
  reportedAt: string;
  category?: "maintenance" | "property_equipment" | "technology";
  description?: string;
  priority?: "low" | "medium" | "high" | "critical";
  assignedTo?: string;
  reportedBy?: string;
  resolvedAt?: string;
  area?: string;
  quantity?: number;
  unitCost?: number;
  urgency?: "routine" | "soon" | "urgent";
  location?: string;
  assetTag?: string;
}

export interface ElectricityBill {
  id: string;
  area: "security" | "apartment" | "borehole";
  month: string;
  amount: number;
  status: "paid" | "unpaid";
  dueDate: string;
  note?: string;
  recordedBy: string;
}

export type WaterMode = "seller" | "buyer";

export interface WaterConfiguration {
  configuredAt: string;
  defaultRatePerM3?: number;
  defaultSupplier?: string;
  mode: WaterMode;
  serviceName: string;
}

export type WaterSaleChannel = "apartment" | "tanker";

export interface WaterSale {
  amountDue: number;
  amountPaid: number;
  channel: WaterSaleChannel;
  customerName: string;
  id: string;
  note?: string;
  ratePerM3?: number;
  reference?: string;
  saleDate: string;
  volumeM3: number;
}

export interface WaterMeter {
  customerName: string;
  digitCount: number;
  id: string;
  meterNumber: string;
  openingReadingM3: number;
  registeredAt: string;
  status: "active" | "inactive";
}

export interface WaterMeterReading {
  amountDue: number;
  amountPaid: number;
  billingMonth: string;
  consumptionM3: number;
  currentReadingM3: number;
  id: string;
  meterId: string;
  previousReadingM3: number;
  ratePerM3: number;
  readingDate: string;
}

export interface WaterPurchaseBill {
  amount: number;
  dueDate: string;
  id: string;
  month: string;
  note?: string;
  reference?: string;
  status: "paid" | "unpaid";
  supplier: string;
  volumeM3?: number;
}

export interface BillingResetRecord {
  arrearsCarried: number;
  id: string;
  kind: "manual" | "automatic";
  month: string;
  recordedBy: string;
  resetAt: string;
  roomsProcessed: number;
}
