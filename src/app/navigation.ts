import type { IconName } from "../components/ui/Icon";

export type PageId =
  | "dashboard"
  | "rooms"
  | "water"
  | "payments"
  | "maintenance"
  | "electricity"
  | "users"
  | "integrations";

export interface NavigationItem {
  id: PageId;
  label: string;
  shortLabel: string;
  icon: IconName;
}

export const navigationItems: NavigationItem[] = [
  { id: "dashboard", label: "Dashboard", shortLabel: "Home", icon: "dashboard" },
  { id: "rooms", label: "Rooms", shortLabel: "Rooms", icon: "rooms" },
  { id: "water", label: "Water", shortLabel: "Water", icon: "water" },
  { id: "maintenance", label: "Maintenance", shortLabel: "Maintain", icon: "maintenance" },
  { id: "electricity", label: "Electricity", shortLabel: "Power", icon: "electricity" },
  { id: "payments", label: "Payments", shortLabel: "Pay", icon: "payments" },
  { id: "users", label: "Settings", shortLabel: "Settings", icon: "settings" },
  { id: "integrations", label: "Integrations", shortLabel: "APIs", icon: "integrations" },
];
