import type { PaymentMethod } from "../types/domain";

export const DEFAULT_PAYMENT_METHOD: PaymentMethod = "mpesa";

export function normalisePreferredPaymentMethod(value: unknown): PaymentMethod {
  return value === "bank" || value === "cash" || value === "mpesa" ? value : DEFAULT_PAYMENT_METHOD;
}
