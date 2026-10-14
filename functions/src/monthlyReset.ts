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
  status: "paid" | "partial" | "unpaid" | "credit";
}

function amount(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function monthlyCharge(room: ResettableRoom): number {
  return Math.max(0, amount(room.rent));
}

export function calculateMonthlyReset(room: ResettableRoom, month: string): { arrearsCarried: number; patch: MonthlyResetPatch } | null {
  if (!String(room.tenant ?? "").trim() || room.lastResetMonth === month) return null;
  // Credit is already part of the room's opening balance. Counting it again as
  // available cash would apply the same overpayment twice at the next reset.
  const balanceBeforeReset = room.bookBalanceDue !== undefined
    ? amount(room.bookBalanceDue) - amount(room.paid) - amount(room.credit)
    : monthlyCharge(room) + amount(room.arrears) - amount(room.credit) - amount(room.paid);
  const arrears = Math.max(0, balanceBeforeReset);
  const credit = Math.max(0, -balanceBeforeReset);
  const nextBalance = monthlyCharge(room) + arrears - credit;
  const status = nextBalance < 0
    ? "credit"
    : nextBalance === 0
      ? "paid"
      : nextBalance < monthlyCharge(room)
        ? "partial"
        : "unpaid";
  return { arrearsCarried: arrears, patch: { arrears, credit, lastResetMonth: month, paid: 0, status } };
}
