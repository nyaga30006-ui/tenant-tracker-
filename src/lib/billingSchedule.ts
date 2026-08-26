export const DEFAULT_BILLING_RESET_DAY = 10;
export const MAX_BILLING_RESET_DAY = 28;

export function normaliseBillingResetDay(value: unknown): number {
  const day = Number(value);
  return Number.isInteger(day) && day >= 1 && day <= MAX_BILLING_RESET_DAY
    ? day
    : DEFAULT_BILLING_RESET_DAY;
}

export function nextBillingResetDate(resetDay: number, from = new Date()): Date {
  const day = normaliseBillingResetDay(resetDay);
  const monthOffset = from.getDate() >= day ? 1 : 0;
  return new Date(from.getFullYear(), from.getMonth() + monthOffset, day);
}

export function formatBillingResetDay(resetDay: number): string {
  const day = normaliseBillingResetDay(resetDay);
  const remainder = day % 100;
  const suffix = remainder >= 11 && remainder <= 13
    ? "th"
    : day % 10 === 1
      ? "st"
      : day % 10 === 2
        ? "nd"
        : day % 10 === 3
          ? "rd"
          : "th";
  return `${day}${suffix}`;
}
