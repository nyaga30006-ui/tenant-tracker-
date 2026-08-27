import { createContext, useCallback, useContext, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { usesFirebaseBackend } from "../config/dataBackend";
import { useFirebaseSession } from "../firebase/FirebaseSessionContext";
import { useProperties } from "../hooks/useProperties";
import {
  LOCAL_DATABASE_KEY,
  emptyLocalPropertyData,
  loadLocalDatabase,
  propertyDataFromBackup,
  saveLocalDatabase,
  updateLocalPropertyData,
  type LocalDatabase,
} from "../repositories/localStorageRepository";
import { createVacantRooms } from "../features/rooms/roomFactory";
import { notificationStateRepository } from "../repositories/notificationStateRepository";
import { paymentRepository } from "../repositories/paymentRepository";
import { propertyDataRepository, type FirebasePropertyData, type FirebasePropertyDataKey } from "../repositories/propertyDataRepository";
import { tenantResidencyRepository } from "../repositories/tenantResidencyRepository";
import { userRepository } from "../repositories/userRepository";
import type { AppUser, BillingResetRecord, ElectricityBill, MaintenanceIssue, Payment, Room, TenantResidency, WaterConfiguration, WaterMeter, WaterMeterReading, WaterPurchaseBill, WaterSale } from "../types/domain";

/**
 * Storage-neutral contract used by feature screens. The local test provider
 * implements it today; the Firebase provider must implement the same actions.
 */
export interface AppDataContextValue {
  authenticatedUserId?: string;
  billingResetHistory: BillingResetRecord[];
  clearCurrentPropertyData: () => void;
  electricityBills: ElectricityBill[];
  maintenanceIssues: MaintenanceIssue[];
  isWaterConfigurationLoading: boolean;
  payments: Payment[];
  provisionProperty: (propertyId: string, roomCount: number) => void;
  recordPayment: (payment: Payment, roomAfterPayment: Room, residencyAfterPayment?: TenantResidency) => Promise<void>;
  saveTenantMoveIn: (residency: TenantResidency, roomAfterMoveIn: Room) => Promise<void>;
  saveTenantMoveOut: (residencyAfterMoveOut: TenantResidency, roomAfterMoveOut: Room, paymentsAfterMoveOut: Payment[]) => Promise<void>;
  restoreCurrentPropertyData: (backup: unknown) => void;
  rooms: Room[];
  setElectricityBills: Dispatch<SetStateAction<ElectricityBill[]>>;
  setBillingResetHistory: Dispatch<SetStateAction<BillingResetRecord[]>>;
  setMaintenanceIssues: Dispatch<SetStateAction<MaintenanceIssue[]>>;
  setPayments: Dispatch<SetStateAction<Payment[]>>;
  setRooms: Dispatch<SetStateAction<Room[]>>;
  setTenantResidencies: Dispatch<SetStateAction<TenantResidency[]>>;
  setUsers: Dispatch<SetStateAction<AppUser[]>>;
  setWaterConfiguration: Dispatch<SetStateAction<WaterConfiguration | null>>;
  setWaterMeterReadings: Dispatch<SetStateAction<WaterMeterReading[]>>;
  setWaterMeters: Dispatch<SetStateAction<WaterMeter[]>>;
  setWaterPurchaseBills: Dispatch<SetStateAction<WaterPurchaseBill[]>>;
  setWaterSales: Dispatch<SetStateAction<WaterSale[]>>;
  storageError: string | null;
  readNotificationIds: string[];
  setReadNotificationIds: Dispatch<SetStateAction<string[]>>;
  storageMode: "local" | "firebase";
  tenantResidencies: TenantResidency[];
  users: AppUser[];
  waterConfiguration: WaterConfiguration | null;
  waterMeterReadings: WaterMeterReading[];
  waterMeters: WaterMeter[];
  waterPurchaseBills: WaterPurchaseBill[];
  waterSales: WaterSale[];
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

function nextValue<T>(current: T[], update: SetStateAction<T[]>): T[] {
  return typeof update === "function" ? (update as (items: T[]) => T[])(current) : update;
}

function nextSetting<T>(current: T, update: SetStateAction<T>): T {
  return typeof update === "function" ? (update as (value: T) => T)(current) : update;
}

function LocalAppDataProvider({ children }: { children: ReactNode }) {
  const { selectedProperty } = useProperties();
  const [database, setDatabase] = useState<LocalDatabase>(loadLocalDatabase);
  const [storageError, setStorageError] = useState<string | null>(null);
  const propertyId = selectedProperty.id;
  const propertyData = database.properties[propertyId] ?? emptyLocalPropertyData();

  useEffect(() => {
    try {
      saveLocalDatabase(database);
      setStorageError(null);
    } catch (error) {
      console.error("The local database could not be saved.", error);
      setStorageError("Your latest changes could not be saved in this browser. Download a backup and check that browser storage is available.");
    }
  }, [database]);

  useEffect(() => {
    setDatabase((current) => {
      if (current.properties[propertyId]?.initialized) return current;
      return {
        ...current,
        properties: {
          ...current.properties,
          [propertyId]: {
            ...emptyLocalPropertyData(),
            rooms: createVacantRooms(selectedProperty.units),
          },
        },
      };
    });
  }, [propertyId, selectedProperty.units]);

  useEffect(() => {
    function syncDatabase(event: StorageEvent) {
      if (event.key === LOCAL_DATABASE_KEY && event.newValue) setDatabase(loadLocalDatabase());
    }
    window.addEventListener("storage", syncDatabase);
    return () => window.removeEventListener("storage", syncDatabase);
  }, []);

  const setRooms = useCallback<Dispatch<SetStateAction<Room[]>>>((update) => {
    setDatabase((current) => updateLocalPropertyData(current, propertyId, (data) => ({ ...data, rooms: nextValue(data.rooms, update) })));
  }, [propertyId]);

  const setTenantResidencies = useCallback<Dispatch<SetStateAction<TenantResidency[]>>>((update) => {
    setDatabase((current) => updateLocalPropertyData(current, propertyId, (data) => ({ ...data, tenantResidencies: nextValue(data.tenantResidencies, update) })));
  }, [propertyId]);

  const setPayments = useCallback<Dispatch<SetStateAction<Payment[]>>>((update) => {
    setDatabase((current) => updateLocalPropertyData(current, propertyId, (data) => ({ ...data, payments: nextValue(data.payments, update) })));
  }, [propertyId]);

  const setMaintenanceIssues = useCallback<Dispatch<SetStateAction<MaintenanceIssue[]>>>((update) => {
    setDatabase((current) => updateLocalPropertyData(current, propertyId, (data) => ({ ...data, maintenanceIssues: nextValue(data.maintenanceIssues, update) })));
  }, [propertyId]);

  const setElectricityBills = useCallback<Dispatch<SetStateAction<ElectricityBill[]>>>((update) => {
    setDatabase((current) => updateLocalPropertyData(current, propertyId, (data) => ({ ...data, electricityBills: nextValue(data.electricityBills, update) })));
  }, [propertyId]);

  const setBillingResetHistory = useCallback<Dispatch<SetStateAction<BillingResetRecord[]>>>((update) => {
    setDatabase((current) => updateLocalPropertyData(current, propertyId, (data) => ({ ...data, billingResetHistory: nextValue(data.billingResetHistory, update) })));
  }, [propertyId]);

  const setReadNotificationIds = useCallback<Dispatch<SetStateAction<string[]>>>((update) => {
    setDatabase((current) => updateLocalPropertyData(current, propertyId, (data) => ({ ...data, readNotificationIds: nextValue(data.readNotificationIds, update) })));
  }, [propertyId]);

  const setWaterConfiguration = useCallback<Dispatch<SetStateAction<WaterConfiguration | null>>>((update) => {
    setDatabase((current) => updateLocalPropertyData(current, propertyId, (data) => ({ ...data, waterConfiguration: nextSetting(data.waterConfiguration, update) })));
  }, [propertyId]);

  const setWaterSales = useCallback<Dispatch<SetStateAction<WaterSale[]>>>((update) => {
    setDatabase((current) => updateLocalPropertyData(current, propertyId, (data) => ({ ...data, waterSales: nextValue(data.waterSales, update) })));
  }, [propertyId]);

  const setWaterMeters = useCallback<Dispatch<SetStateAction<WaterMeter[]>>>((update) => {
    setDatabase((current) => updateLocalPropertyData(current, propertyId, (data) => ({ ...data, waterMeters: nextValue(data.waterMeters, update) })));
  }, [propertyId]);

  const setWaterMeterReadings = useCallback<Dispatch<SetStateAction<WaterMeterReading[]>>>((update) => {
    setDatabase((current) => updateLocalPropertyData(current, propertyId, (data) => ({ ...data, waterMeterReadings: nextValue(data.waterMeterReadings, update) })));
  }, [propertyId]);

  const setWaterPurchaseBills = useCallback<Dispatch<SetStateAction<WaterPurchaseBill[]>>>((update) => {
    setDatabase((current) => updateLocalPropertyData(current, propertyId, (data) => ({ ...data, waterPurchaseBills: nextValue(data.waterPurchaseBills, update) })));
  }, [propertyId]);

  const setUsers = useCallback<Dispatch<SetStateAction<AppUser[]>>>((update) => {
    setDatabase((current) => ({ ...current, users: nextValue(current.users, update) }));
  }, []);

  const provisionProperty = useCallback((newPropertyId: string, roomCount: number) => {
    setDatabase((current) => {
      const existing = current.properties[newPropertyId];
      if (existing?.rooms.length) return current;
      const data = existing ?? emptyLocalPropertyData();
      return {
        ...current,
        properties: {
          ...current.properties,
          [newPropertyId]: { ...data, initialized: true, rooms: createVacantRooms(roomCount) },
        },
      };
    });
  }, []);

  const recordPayment = useCallback((payment: Payment, roomAfterPayment: Room, residencyAfterPayment?: TenantResidency) => {
    setDatabase((current) => updateLocalPropertyData(current, propertyId, (data) => ({
      ...data,
      payments: [payment, ...data.payments],
      rooms: data.rooms.map((room) => room.id === roomAfterPayment.id ? roomAfterPayment : room),
      tenantResidencies: residencyAfterPayment
        ? data.tenantResidencies.map((residency) => residency.id === residencyAfterPayment.id ? residencyAfterPayment : residency)
        : data.tenantResidencies,
    })));
    return Promise.resolve();
  }, [propertyId]);

  const saveTenantMoveIn = useCallback((residency: TenantResidency, roomAfterMoveIn: Room) => {
    setDatabase((current) => updateLocalPropertyData(current, propertyId, (data) => ({
      ...data,
      rooms: data.rooms.map((room) => room.id === roomAfterMoveIn.id ? roomAfterMoveIn : room),
      tenantResidencies: [residency, ...data.tenantResidencies.filter((item) => item.id !== residency.id)],
    })));
    return Promise.resolve();
  }, [propertyId]);

  const saveTenantMoveOut = useCallback((residencyAfterMoveOut: TenantResidency, roomAfterMoveOut: Room, paymentsAfterMoveOut: Payment[]) => {
    const paymentsById = new Map(paymentsAfterMoveOut.map((payment) => [payment.id, payment]));
    setDatabase((current) => updateLocalPropertyData(current, propertyId, (data) => ({
      ...data,
      payments: data.payments.map((payment) => paymentsById.get(payment.id) ?? payment),
      rooms: data.rooms.map((room) => room.id === roomAfterMoveOut.id ? roomAfterMoveOut : room),
      tenantResidencies: data.tenantResidencies.map((residency) => residency.id === residencyAfterMoveOut.id ? residencyAfterMoveOut : residency),
    })));
    return Promise.resolve();
  }, [propertyId]);

  const clearCurrentPropertyData = useCallback(() => {
    setDatabase((current) => ({ ...current, properties: { ...current.properties, [propertyId]: emptyLocalPropertyData() } }));
  }, [propertyId]);

  const restoreCurrentPropertyData = useCallback((backup: unknown) => {
    const restored = propertyDataFromBackup(backup);
    setDatabase((current) => ({
      ...current,
      properties: { ...current.properties, [propertyId]: restored.data },
      users: restored.users ?? current.users,
    }));
  }, [propertyId]);

  const value = useMemo<AppDataContextValue>(() => ({
    billingResetHistory: propertyData.billingResetHistory,
    clearCurrentPropertyData,
    electricityBills: propertyData.electricityBills,
    maintenanceIssues: propertyData.maintenanceIssues,
    isWaterConfigurationLoading: false,
    payments: propertyData.payments,
    provisionProperty,
    recordPayment,
    saveTenantMoveIn,
    saveTenantMoveOut,
    restoreCurrentPropertyData,
    rooms: propertyData.rooms,
    setElectricityBills,
    setBillingResetHistory,
    setMaintenanceIssues,
    setPayments,
    setRooms,
    setTenantResidencies,
    setUsers,
    setWaterConfiguration,
    setWaterMeterReadings,
    setWaterMeters,
    setWaterPurchaseBills,
    setWaterSales,
    storageError,
    readNotificationIds: propertyData.readNotificationIds,
    setReadNotificationIds,
    storageMode: "local",
    tenantResidencies: propertyData.tenantResidencies,
    users: database.users,
    waterConfiguration: propertyData.waterConfiguration,
    waterMeterReadings: propertyData.waterMeterReadings,
    waterMeters: propertyData.waterMeters,
    waterPurchaseBills: propertyData.waterPurchaseBills,
    waterSales: propertyData.waterSales,
  }), [clearCurrentPropertyData, database.users, propertyData, provisionProperty, recordPayment, restoreCurrentPropertyData, saveTenantMoveIn, saveTenantMoveOut, setBillingResetHistory, setElectricityBills, setMaintenanceIssues, setPayments, setReadNotificationIds, setRooms, setTenantResidencies, setUsers, setWaterConfiguration, setWaterMeterReadings, setWaterMeters, setWaterPurchaseBills, setWaterSales, storageError]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

type FirebaseArrayKey = Exclude<FirebasePropertyDataKey, "waterConfiguration">;

function emptyFirebasePropertyData(): FirebasePropertyData {
  return {
    billingResetHistory: [],
    electricityBills: [],
    maintenanceIssues: [],
    payments: [],
    rooms: [],
    tenantResidencies: [],
    waterConfiguration: null,
    waterMeterReadings: [],
    waterMeters: [],
    waterPurchaseBills: [],
    waterSales: [],
  };
}

function FirebaseAppDataProvider({ children }: { children: ReactNode }) {
  const { authUser, profile } = useFirebaseSession();
  const { selectedProperty } = useProperties();
  const [data, setData] = useState<FirebasePropertyData>(emptyFirebasePropertyData);
  const [isWaterConfigurationLoading, setIsWaterConfigurationLoading] = useState(true);
  const [users, setUsersState] = useState<AppUser[]>(profile ? [profile] : []);
  const [readNotificationIds, setReadNotificationIdsState] = useState<string[]>([]);
  const [storageError, setStorageError] = useState<string | null>(null);
  const propertyId = selectedProperty.id;

  const reportStorageError = useCallback((error: unknown) => {
    console.error("Firebase could not save or load MyProperty data.", error);
    setStorageError(error instanceof Error ? error.message : "Firebase could not save or load this change.");
  }, []);

  useEffect(() => {
    setData(emptyFirebasePropertyData());
    setIsWaterConfigurationLoading(true);
    if (!propertyId || propertyId === "pending-property") {
      setIsWaterConfigurationLoading(false);
      return;
    }
    return propertyDataRepository.subscribe(propertyId, (patch) => {
      if (Object.prototype.hasOwnProperty.call(patch, "waterConfiguration")) setIsWaterConfigurationLoading(false);
      setData((current) => ({ ...current, ...patch }));
      setStorageError(null);
    }, (error) => {
      setIsWaterConfigurationLoading(false);
      reportStorageError(error);
    });
  }, [propertyId, reportStorageError]);

  useEffect(() => {
    if (!authUser || !propertyId || propertyId === "pending-property") return;
    return notificationStateRepository.subscribe(propertyId, authUser.uid, setReadNotificationIdsState, reportStorageError);
  }, [authUser, propertyId, reportStorageError]);

  useEffect(() => {
    if (!profile) {
      setUsersState([]);
      return;
    }
    if (profile.role !== "admin") {
      setUsersState([profile]);
      return;
    }
    return userRepository.subscribeAll(setUsersState, reportStorageError);
  }, [profile, reportStorageError]);

  const updateArray = useCallback(function updateFirebaseArray<K extends FirebaseArrayKey>(key: K, update: SetStateAction<FirebasePropertyData[K]>) {
    setData((current) => {
      const next = typeof update === "function"
        ? (update as (value: FirebasePropertyData[K]) => FirebasePropertyData[K])(current[key])
        : update;
      void propertyDataRepository.upsertChanged(propertyId, key, current[key], next).catch(reportStorageError);
      return { ...current, [key]: next };
    });
  }, [propertyId, reportStorageError]);

  const setWaterConfiguration = useCallback<Dispatch<SetStateAction<WaterConfiguration | null>>>((update) => {
    setData((current) => {
      const next = nextSetting(current.waterConfiguration, update);
      void propertyDataRepository.saveWaterConfiguration(propertyId, next).catch(reportStorageError);
      return { ...current, waterConfiguration: next };
    });
  }, [propertyId, reportStorageError]);

  const setReadNotificationIds = useCallback<Dispatch<SetStateAction<string[]>>>((update) => {
    setReadNotificationIdsState((current) => {
      const next = nextValue(current, update);
      if (authUser) void notificationStateRepository.save(propertyId, authUser.uid, next).catch(reportStorageError);
      return next;
    });
  }, [authUser, propertyId, reportStorageError]);

  const setUsers = useCallback<Dispatch<SetStateAction<AppUser[]>>>((update) => {
    setUsersState((current) => {
      const next = nextValue(current, update);
      const currentById = new Map(current.map((user) => [user.id, user]));
      for (const user of next) {
        if (JSON.stringify(currentById.get(user.id)) !== JSON.stringify(user)) void userRepository.save(user).catch(reportStorageError);
      }
      return next;
    });
  }, [reportStorageError]);

  const recordPayment = useCallback(async (payment: Payment, roomAfterPayment: Room, residencyAfterPayment?: TenantResidency) => {
    await paymentRepository.save(propertyId, payment, roomAfterPayment, residencyAfterPayment);
    setData((current) => ({
      ...current,
      payments: current.payments.some((item) => item.id === payment.id) ? current.payments : [payment, ...current.payments],
      rooms: current.rooms.map((room) => room.id === roomAfterPayment.id ? roomAfterPayment : room),
      tenantResidencies: residencyAfterPayment
        ? current.tenantResidencies.map((residency) => residency.id === residencyAfterPayment.id ? residencyAfterPayment : residency)
        : current.tenantResidencies,
    }));
  }, [propertyId]);

  const saveTenantMoveIn = useCallback(async (residency: TenantResidency, roomAfterMoveIn: Room) => {
    await tenantResidencyRepository.moveIn(propertyId, residency, roomAfterMoveIn);
    setData((current) => ({
      ...current,
      rooms: current.rooms.map((room) => room.id === roomAfterMoveIn.id ? roomAfterMoveIn : room),
      tenantResidencies: [residency, ...current.tenantResidencies.filter((item) => item.id !== residency.id)],
    }));
  }, [propertyId]);

  const saveTenantMoveOut = useCallback(async (residencyAfterMoveOut: TenantResidency, roomAfterMoveOut: Room, paymentsAfterMoveOut: Payment[]) => {
    const existingById = new Map(data.payments.map((payment) => [payment.id, payment]));
    const changedPayments = paymentsAfterMoveOut.filter((payment) => {
      const existing = existingById.get(payment.id);
      return existing?.residency !== payment.residency || existing?.residencyId !== payment.residencyId;
    });
    await tenantResidencyRepository.moveOut(propertyId, residencyAfterMoveOut, roomAfterMoveOut, changedPayments);
    const paymentsById = new Map(paymentsAfterMoveOut.map((payment) => [payment.id, payment]));
    setData((current) => ({
      ...current,
      payments: current.payments.map((payment) => paymentsById.get(payment.id) ?? payment),
      rooms: current.rooms.map((room) => room.id === roomAfterMoveOut.id ? roomAfterMoveOut : room),
      tenantResidencies: current.tenantResidencies.map((residency) => residency.id === residencyAfterMoveOut.id ? residencyAfterMoveOut : residency),
    }));
  }, [data.payments, propertyId]);

  const value = useMemo<AppDataContextValue>(() => ({
    authenticatedUserId: authUser?.uid,
    billingResetHistory: data.billingResetHistory,
    clearCurrentPropertyData: () => setStorageError("Firebase property clearing is intentionally disabled until the dedicated admin deletion workflow is implemented."),
    electricityBills: data.electricityBills,
    isWaterConfigurationLoading,
    maintenanceIssues: data.maintenanceIssues,
    payments: data.payments,
    provisionProperty: () => undefined,
    recordPayment,
    saveTenantMoveIn,
    saveTenantMoveOut,
    restoreCurrentPropertyData: () => setStorageError("Firebase restore is intentionally disabled. Backups will first be imported through the audited migration tool."),
    rooms: data.rooms,
    setElectricityBills: (update) => updateArray("electricityBills", update),
    setBillingResetHistory: (update) => updateArray("billingResetHistory", update),
    setMaintenanceIssues: (update) => updateArray("maintenanceIssues", update),
    setPayments: (update) => updateArray("payments", update),
    setRooms: (update) => updateArray("rooms", update),
    setTenantResidencies: (update) => updateArray("tenantResidencies", update),
    setUsers,
    setWaterConfiguration,
    setWaterMeterReadings: (update) => updateArray("waterMeterReadings", update),
    setWaterMeters: (update) => updateArray("waterMeters", update),
    setWaterPurchaseBills: (update) => updateArray("waterPurchaseBills", update),
    setWaterSales: (update) => updateArray("waterSales", update),
    storageError,
    readNotificationIds,
    setReadNotificationIds,
    storageMode: "firebase",
    tenantResidencies: data.tenantResidencies,
    users,
    waterConfiguration: data.waterConfiguration,
    waterMeterReadings: data.waterMeterReadings,
    waterMeters: data.waterMeters,
    waterPurchaseBills: data.waterPurchaseBills,
    waterSales: data.waterSales,
  }), [authUser?.uid, data, isWaterConfigurationLoading, readNotificationIds, recordPayment, saveTenantMoveIn, saveTenantMoveOut, setReadNotificationIds, setUsers, setWaterConfiguration, storageError, updateArray, users]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  return usesFirebaseBackend()
    ? <FirebaseAppDataProvider>{children}</FirebaseAppDataProvider>
    : <LocalAppDataProvider>{children}</LocalAppDataProvider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) throw new Error("useAppData must be used inside AppDataProvider.");
  return context;
}
