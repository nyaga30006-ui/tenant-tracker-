import { demoElectricityBills, demoMaintenance, demoPayments, demoProperties, demoRooms, demoUsers } from "../data/demo";
import { normaliseBillingResetDay } from "../lib/billingSchedule";
import { normalisePreferredPaymentMethod } from "../lib/paymentPreferences";
import type { AppUser, BillingResetRecord, ElectricityBill, MaintenanceIssue, Payment, Property, Room, TenantResidency, WaterConfiguration, WaterMeter, WaterMeterReading, WaterPurchaseBill, WaterSale } from "../types/domain";

export const LOCAL_DATABASE_KEY = "myproperty.local-database.v1";
export const LOCAL_PORTFOLIO_KEY = "myproperty.local-portfolio.v1";
export const LOCAL_DATABASE_VERSION = 1;

export interface LocalPropertyData {
  billingResetHistory: BillingResetRecord[];
  electricityBills: ElectricityBill[];
  initialized: boolean;
  maintenanceIssues: MaintenanceIssue[];
  payments: Payment[];
  rooms: Room[];
  tenantResidencies: TenantResidency[];
  waterConfiguration: WaterConfiguration | null;
  waterMeterReadings: WaterMeterReading[];
  waterMeters: WaterMeter[];
  waterPurchaseBills: WaterPurchaseBill[];
  waterSales: WaterSale[];
  readNotificationIds: string[];
}

export interface LocalDatabase {
  properties: Record<string, LocalPropertyData>;
  users: AppUser[];
  version: typeof LOCAL_DATABASE_VERSION;
}

export interface LocalPortfolio {
  properties: Property[];
  selectedPropertyId: string;
  version: typeof LOCAL_DATABASE_VERSION;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function arrayValue<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function normaliseProperty(property: Property): Property {
  return { ...property, billingResetDay: normaliseBillingResetDay(property.billingResetDay), preferredPaymentMethod: normalisePreferredPaymentMethod(property.preferredPaymentMethod) };
}

function normaliseUser(user: AppUser): AppUser {
  const assignedPropertyIds = Array.isArray(user.assignedPropertyIds)
    ? user.assignedPropertyIds.map(String)
    : user.role === "admin" ? [] : [demoProperties[0].id];
  const landlordAccess = user.landlordAccess === "full" ? "full" : "view";
  const landlordAccessRequest = user.landlordAccessRequest === "full" || user.landlordAccessRequest === "view" ? user.landlordAccessRequest : undefined;
  return { ...user, assignedPropertyIds, landlordAccess, landlordAccessRequest };
}

function normaliseWaterMeter(meter: WaterMeter): WaterMeter {
  const requestedDigitCount = Number(meter.digitCount);
  const digitCount = Number.isFinite(requestedDigitCount)
    ? Math.min(8, Math.max(3, Math.round(requestedDigitCount)))
    : 5;
  return { ...meter, digitCount };
}

export function emptyLocalPropertyData(initialized = true): LocalPropertyData {
  return { billingResetHistory: [], electricityBills: [], initialized, maintenanceIssues: [], payments: [], readNotificationIds: [], rooms: [], tenantResidencies: [], waterConfiguration: null, waterMeterReadings: [], waterMeters: [], waterPurchaseBills: [], waterSales: [] };
}

function ensureResidencyLinks(rooms: Room[], payments: Payment[], existingResidencies: TenantResidency[]) {
  const tenantResidencies = existingResidencies.map((residency) => ({ ...residency }));
  const activeByRoom = new Map(tenantResidencies.filter((residency) => residency.status === "active").map((residency) => [residency.roomId, residency]));

  const linkedRooms = rooms.map((room) => {
    if (!room.tenant) return { ...room, activeResidencyId: undefined };
    const linked = room.activeResidencyId
      ? tenantResidencies.find((residency) => residency.id === room.activeResidencyId && residency.status === "active")
      : activeByRoom.get(room.id);
    if (linked) return { ...room, activeResidencyId: linked.id };

    const legacyId = `legacy-residency-${room.id}`;
    const id = tenantResidencies.some((residency) => residency.id === legacyId) ? `legacy-active-residency-${room.id}` : legacyId;
    const earliestPayment = payments
      .filter((payment) => payment.roomId === room.id && (payment.residency ?? "current") === "current")
      .map((payment) => payment.receivedAt.slice(0, 10))
      .sort()[0];
    const residency: TenantResidency = {
      depositHeld: room.depositPaid ?? 0,
      id,
      moveInDate: earliestPayment ?? (room.lastResetMonth ? `${room.lastResetMonth}-01` : new Date().toISOString().slice(0, 10)),
      movedInBy: "Imported existing record",
      roomId: room.id,
      status: "active",
      tenantName: room.tenant,
    };
    tenantResidencies.push(residency);
    activeByRoom.set(room.id, residency);
    return { ...room, activeResidencyId: id };
  });

  const linkedPayments = payments.map((payment) => {
    if (payment.residencyId || (payment.residency ?? "current") === "former") return payment;
    const activeResidency = activeByRoom.get(payment.roomId);
    return activeResidency ? { ...payment, residencyId: activeResidency.id } : payment;
  });

  return { payments: linkedPayments, rooms: linkedRooms, tenantResidencies };
}

function defaultDatabase(): LocalDatabase {
  const linked = ensureResidencyLinks(demoRooms.map((room) => ({ ...room })), demoPayments.map((payment) => ({ ...payment })), []);
  return {
    properties: {
      [demoProperties[0].id]: {
        billingResetHistory: [],
        electricityBills: demoElectricityBills.map((bill) => ({ ...bill })),
        initialized: true,
        maintenanceIssues: demoMaintenance.map((issue) => ({ ...issue })),
        payments: linked.payments,
        rooms: linked.rooms,
        tenantResidencies: linked.tenantResidencies,
        waterConfiguration: null,
        waterMeterReadings: [],
        waterMeters: [],
        waterPurchaseBills: [],
        waterSales: [],
        readNotificationIds: [],
      },
    },
    users: demoUsers.map((user) => ({ ...user, assignedPropertyIds: [...user.assignedPropertyIds] })),
    version: LOCAL_DATABASE_VERSION,
  };
}

function normalisePropertyData(value: unknown): LocalPropertyData {
  if (!isRecord(value)) return emptyLocalPropertyData(false);
  const waterConfiguration = isRecord(value.waterConfiguration) && (value.waterConfiguration.mode === "seller" || value.waterConfiguration.mode === "buyer")
    ? value.waterConfiguration as unknown as WaterConfiguration
    : null;
  const billingResetHistory = arrayValue<BillingResetRecord>(value.billingResetHistory);
  const electricityBills = arrayValue<ElectricityBill>(value.electricityBills);
  const maintenanceIssues = arrayValue<MaintenanceIssue>(value.maintenanceIssues ?? value.maintenance);
  const residencyLinks = ensureResidencyLinks(arrayValue<Room>(value.rooms), arrayValue<Payment>(value.payments), arrayValue<TenantResidency>(value.tenantResidencies));
  const payments = residencyLinks.payments;
  const rooms = residencyLinks.rooms;
  const tenantResidencies = residencyLinks.tenantResidencies;
  const waterMeterReadings = arrayValue<WaterMeterReading>(value.waterMeterReadings);
  const waterMeters = arrayValue<WaterMeter>(value.waterMeters).map(normaliseWaterMeter);
  const waterPurchaseBills = arrayValue<WaterPurchaseBill>(value.waterPurchaseBills);
  const waterSales = arrayValue<WaterSale>(value.waterSales);
  const hasOperationalData = Boolean(billingResetHistory.length || electricityBills.length || maintenanceIssues.length || payments.length || rooms.length || tenantResidencies.length || waterConfiguration || waterMeterReadings.length || waterMeters.length || waterPurchaseBills.length || waterSales.length);
  return {
    billingResetHistory,
    electricityBills,
    initialized: value.initialized === true || hasOperationalData,
    maintenanceIssues,
    payments,
    rooms,
    tenantResidencies,
    waterConfiguration,
    waterMeterReadings,
    waterMeters,
    waterPurchaseBills,
    waterSales,
    readNotificationIds: arrayValue<string>(value.readNotificationIds),
  };
}

export function loadLocalDatabase(): LocalDatabase {
  try {
    const stored = window.localStorage.getItem(LOCAL_DATABASE_KEY);
    if (!stored) return defaultDatabase();
    const parsed: unknown = JSON.parse(stored);
    if (!isRecord(parsed) || parsed.version !== LOCAL_DATABASE_VERSION || !isRecord(parsed.properties)) return defaultDatabase();
    const properties = Object.fromEntries(Object.entries(parsed.properties).map(([propertyId, data]) => [propertyId, normalisePropertyData(data)]));
    return { properties, users: arrayValue<AppUser>(parsed.users).map(normaliseUser), version: LOCAL_DATABASE_VERSION };
  } catch (error) {
    console.error("Local database could not be loaded.", error);
    return defaultDatabase();
  }
}

export function saveLocalDatabase(database: LocalDatabase): void {
  window.localStorage.setItem(LOCAL_DATABASE_KEY, JSON.stringify(database));
}

export function updateLocalPropertyData(database: LocalDatabase, propertyId: string, update: (data: LocalPropertyData) => LocalPropertyData): LocalDatabase {
  const current = database.properties[propertyId] ?? emptyLocalPropertyData();
  return {
    ...database,
    properties: {
      ...database.properties,
      [propertyId]: update(current),
    },
  };
}

export function loadLocalPortfolio(): LocalPortfolio {
  const fallback: LocalPortfolio = {
    properties: demoProperties.map((property) => ({ ...property })),
    selectedPropertyId: demoProperties[0].id,
    version: LOCAL_DATABASE_VERSION,
  };
  try {
    const stored = window.localStorage.getItem(LOCAL_PORTFOLIO_KEY);
    if (!stored) return fallback;
    const parsed: unknown = JSON.parse(stored);
    if (!isRecord(parsed) || parsed.version !== LOCAL_DATABASE_VERSION) return fallback;
    const properties = arrayValue<Property>(parsed.properties).map(normaliseProperty);
    if (!properties.length) return fallback;
    const requestedId = String(parsed.selectedPropertyId ?? "");
    return {
      properties,
      selectedPropertyId: properties.some((property) => property.id === requestedId) ? requestedId : properties[0].id,
      version: LOCAL_DATABASE_VERSION,
    };
  } catch (error) {
    console.error("Local property portfolio could not be loaded.", error);
    return fallback;
  }
}

export function saveLocalPortfolio(portfolio: LocalPortfolio): void {
  window.localStorage.setItem(LOCAL_PORTFOLIO_KEY, JSON.stringify(portfolio));
}

export function propertyDataFromBackup(backup: unknown): { data: LocalPropertyData; users?: AppUser[] } {
  if (!isRecord(backup)) throw new Error("The selected file is not a valid MyProperty backup.");
  const source = isRecord(backup.data) ? backup.data : backup;
  const data = normalisePropertyData(source);
  if (!data.rooms.length && !data.payments.length && !data.tenantResidencies.length && !data.maintenanceIssues.length && !data.electricityBills.length && !data.waterPurchaseBills.length && !data.waterSales.length && !data.waterMeters.length && !data.waterMeterReadings.length && !data.waterConfiguration) {
    throw new Error("The backup does not contain property records or a water configuration.");
  }
  return { data, users: Array.isArray(source.users) ? source.users as AppUser[] : undefined };
}
