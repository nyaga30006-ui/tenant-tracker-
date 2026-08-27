import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useProperties } from "../hooks/useProperties";
import { useAppData } from "../store/AppDataProvider";
import type { AppUser, Property } from "../types/domain";
import type { PageId } from "./navigation";

const LOCAL_CURRENT_USER_KEY = "myproperty.local-current-user.v1";

export interface AccessPermissions {
  canAddProperties: boolean;
  canConfigureWater: boolean;
  canCorrectPayments: boolean;
  canManageElectricity: boolean;
  canManageMaintenance: boolean;
  canManageResidencies: boolean;
  canManageRooms: boolean;
  canManageUsers: boolean;
  canManageWater: boolean;
  canRecordPayments: boolean;
  canResetMonths: boolean;
  canSetBooks: boolean;
  canViewDashboard: boolean;
  isReadOnly: boolean;
}

interface AccessContextValue {
  accessibleProperties: Property[];
  canViewPage: (page: PageId) => boolean;
  currentUser: AppUser;
  defaultPage: PageId;
  permissions: AccessPermissions;
  switchUser: (userId: string) => void;
}

const AccessContext = createContext<AccessContextValue | null>(null);

const fallbackAdmin: AppUser = {
  assignedPropertyIds: [],
  disabled: false,
  email: "admin@example.com",
  id: "admin-1",
  landlordAccess: "full",
  role: "admin",
  username: "Property Admin",
};

export function permissionsFor(user: AppUser): AccessPermissions {
  if (user.role === "admin") {
    return { canAddProperties: true, canConfigureWater: true, canCorrectPayments: true, canManageElectricity: true, canManageMaintenance: true, canManageResidencies: true, canManageRooms: true, canManageUsers: true, canManageWater: true, canRecordPayments: true, canResetMonths: true, canSetBooks: true, canViewDashboard: true, isReadOnly: false };
  }
  if (user.role === "caretaker") {
    return { canAddProperties: false, canConfigureWater: false, canCorrectPayments: false, canManageElectricity: true, canManageMaintenance: true, canManageResidencies: true, canManageRooms: false, canManageUsers: false, canManageWater: true, canRecordPayments: true, canResetMonths: false, canSetBooks: false, canViewDashboard: false, isReadOnly: false };
  }
  const hasFullAccess = user.landlordAccess === "full";
  return { canAddProperties: false, canConfigureWater: hasFullAccess, canCorrectPayments: hasFullAccess, canManageElectricity: hasFullAccess, canManageMaintenance: hasFullAccess, canManageResidencies: hasFullAccess, canManageRooms: hasFullAccess, canManageUsers: false, canManageWater: hasFullAccess, canRecordPayments: hasFullAccess, canResetMonths: hasFullAccess, canSetBooks: false, canViewDashboard: true, isReadOnly: !hasFullAccess };
}

function pageAllowed(user: AppUser, permissions: AccessPermissions, page: PageId): boolean {
  if (page === "dashboard") return permissions.canViewDashboard;
  if (page === "users") return user.role === "admin" || user.role === "landlord";
  if (page === "integrations") return user.role === "admin";
  return true;
}

export function AccessProvider({ children }: { children: ReactNode }) {
  const { properties, selectedProperty, selectProperty } = useProperties();
  const { authenticatedUserId, storageMode, users } = useAppData();
  const [currentUserId, setCurrentUserId] = useState(() => window.localStorage.getItem(LOCAL_CURRENT_USER_KEY) ?? "admin-1");
  const activeUsers = users.filter((user) => !user.disabled);
  const effectiveUserId = storageMode === "firebase" ? authenticatedUserId : currentUserId;
  const currentUser = activeUsers.find((user) => user.id === effectiveUserId) ?? activeUsers.find((user) => user.role === "admin") ?? activeUsers[0] ?? fallbackAdmin;
  const permissions = useMemo(() => permissionsFor(currentUser), [currentUser]);
  const accessibleProperties = useMemo(() => currentUser.role === "admin" ? properties : properties.filter((property) => currentUser.assignedPropertyIds.includes(property.id)), [currentUser, properties]);

  useEffect(() => {
    if (storageMode === "local") window.localStorage.setItem(LOCAL_CURRENT_USER_KEY, currentUser.id);
  }, [currentUser.id, storageMode]);

  useEffect(() => {
    if (accessibleProperties.length && !accessibleProperties.some((property) => property.id === selectedProperty.id)) selectProperty(accessibleProperties[0].id);
  }, [accessibleProperties, selectProperty, selectedProperty.id]);

  const value = useMemo<AccessContextValue>(() => ({
    accessibleProperties,
    canViewPage: (page) => pageAllowed(currentUser, permissions, page),
    currentUser,
    defaultPage: permissions.canViewDashboard ? "dashboard" : "rooms",
    permissions,
    switchUser: (userId) => {
      if (storageMode === "local" && activeUsers.some((user) => user.id === userId)) setCurrentUserId(userId);
    },
  }), [accessibleProperties, activeUsers, currentUser, permissions, storageMode]);

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const context = useContext(AccessContext);
  if (!context) throw new Error("useAccess must be used inside AccessProvider.");
  return context;
}
