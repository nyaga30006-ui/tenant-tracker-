import type { Payment, Room } from "../types/domain";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_MONTH_PATTERN = /^\d{4}-\d{2}$/;

export function isValidDateInput(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

export function isValidMonthInput(value: string): boolean {
  if (!ISO_MONTH_PATTERN.test(value)) return false;
  const [year, month] = value.split("-").map(Number);
  return year >= 2000 && month >= 1 && month <= 12;
}

export function validateDate(value: string, label: string, options: { min?: string; max?: string } = {}): string {
  if (!isValidDateInput(value)) return `Enter a valid ${label.toLowerCase()}.`;
  if (options.min && value < options.min) return `${label} cannot be before ${options.min}.`;
  if (options.max && value > options.max) return `${label} cannot be after ${options.max}.`;
  return "";
}

export function normalisedReference(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function findDuplicatePaymentReference(payments: Payment[], reference: string, excludePaymentId?: string): Payment | undefined {
  const requested = normalisedReference(reference);
  if (!requested) return undefined;
  return payments.find((payment) => payment.id !== excludePaymentId && normalisedReference(payment.reference) === requested);
}

export function normalisedRoomNumber(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, " ");
}

export function findDuplicateRoomNumber(rooms: Room[], roomNumber: string, excludeRoomId?: string): Room | undefined {
  const requested = normalisedRoomNumber(roomNumber);
  if (!requested) return undefined;
  return rooms.find((room) => room.id !== excludeRoomId && normalisedRoomNumber(room.number) === requested);
}

