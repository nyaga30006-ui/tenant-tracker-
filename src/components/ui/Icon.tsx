import {
  AlertTriangle,
  Banknote,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  Cable,
  Check,
  ChevronRight,
  CircleHelp,
  CreditCard,
  Droplets,
  Ellipsis,
  FileDown,
  Hammer,
  HandCoins,
  History,
  House,
  Landmark,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  MapPin,
  Moon,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Sun,
  UserRound,
  UserMinus,
  UserPlus,
  UsersRound,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type IconName =
  | "dashboard"
  | "rooms"
  | "payments"
  | "maintenance"
  | "electricity"
  | "water"
  | "users"
  | "integrations"
  | "building"
  | "bell"
  | "calendar"
  | "plus"
  | "settings"
  | "help"
  | "logout"
  | "more"
  | "arrow"
  | "close"
  | "check"
  | "location"
  | "sun"
  | "moon"
  | "search"
  | "download"
  | "payment"
  | "history"
  | "bank"
  | "cash"
  | "phone"
  | "user"
  | "tools"
  | "lightbulb"
  | "security"
  | "edit"
  | "reset"
  | "book"
  | "moveIn"
  | "moveOut"
  | "warning";

interface IconProps {
  name: IconName;
  size?: number;
}

const icons: Record<IconName, LucideIcon> = {
  warning: AlertTriangle,
  dashboard: LayoutDashboard,
  rooms: House,
  payments: CreditCard,
  maintenance: Wrench,
  electricity: Zap,
  water: Droplets,
  users: UsersRound,
  integrations: Cable,
  building: Building2,
  bell: Bell,
  calendar: CalendarDays,
  plus: Plus,
  settings: Settings,
  help: CircleHelp,
  logout: LogOut,
  more: Ellipsis,
  arrow: ChevronRight,
  close: X,
  check: Check,
  location: MapPin,
  sun: Sun,
  moon: Moon,
  search: Search,
  download: FileDown,
  payment: HandCoins,
  history: History,
  bank: Landmark,
  cash: Banknote,
  phone: Smartphone,
  user: UserRound,
  tools: Hammer,
  lightbulb: Lightbulb,
  security: ShieldCheck,
  edit: Pencil,
  reset: RotateCcw,
  book: BookOpen,
  moveIn: UserPlus,
  moveOut: UserMinus,
};

export function Icon({ name, size = 18 }: IconProps) {
  const IconComponent = icons[name];
  return <IconComponent aria-hidden="true" className="icon" size={size} strokeWidth={1.8} />;
}
