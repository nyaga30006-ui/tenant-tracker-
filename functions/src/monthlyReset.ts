export interface ResettableRoom {
  arrears?: number;
  bookBalanceDue?: number;
  credit?: number;
  depositDueEnabled?: boolean;
  depositPaid?: number;
  depositRequired?: number;
  electricityDueEnabled?: boolean;
  electricityFee?: number;
  lastResetMonth?: string;
  paid?: number;
  rent?: number;
  tenant?: string;
}

export interface MonthlyResetPatch {
  arrears: number;
  credit: number;
  lastResetMonth: string;
  paid: 0;
  status: "paid" | "unpaid" | "credit";
}

function amount(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function monthlyCharge(room: ResettableRoom): number {
  const electricity = room.electricityDueEnabled ? amount(room.electricityFee ?? 2500) : 0;
  return Math.max(0, amount(room.rent) + electricity);
}

function depositDue(room: ResettableRoom): number {
  if (!room.depositDueEnabled) return 0;
  return Math.max(0, amount(room.depositRequired ?? room.rent) - amount(room.depositPaid));
}

export function calculateMonthlyReset(room: ResettableRoom, month: string): { arrearsCarried: number; patch: MonthlyResetPatch } | null {
  if (!String(room.tenant ?? "").trim() || room.lastResetMonth === month) return null;
  const recurringDue = room.bookBalanceDue !== undefined
    ? Math.max(0, amount(room.bookBalanceDue))
    : Math.max(0, monthlyCharge(room) + amount(room.arrears) - amount(room.credit));
  const available = amount(room.paid) + amount(room.credit);
  const arrears = Math.max(0, recurringDue - available);
  const credit = Math.max(0, available - recurringDue);
  const nextBalance = Math.max(0, monthlyCharge(room) + arrears - credit) + depositDue(room);
  const status = credit > 0 ? "credit" : nextBalance === 0 ? "paid" : "unpaid";
  return { arrearsCarried: arrears, patch: { arrears, credit, lastResetMonth: month, paid: 0, status } };
}

