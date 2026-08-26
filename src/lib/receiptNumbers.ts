import type { Payment } from "../types/domain";

export function propertyReceiptPrefix(propertyName: string): string {
  const firstWord = propertyName.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 20);
  const consonants = firstWord.replace(/[AEIOU]/g, "");
  return (consonants || firstWord || "PRP").slice(0, 3).padEnd(3, "X");
}

export function nextPaymentReceipt(receivedAt: string, payments: Payment[], prefix: string, excludePaymentId?: string): string {
  const compactMonth = receivedAt.slice(0, 7).replace("-", "");
  const receiptPrefix = `${prefix}-${compactMonth}-`;
  const highest = payments.reduce((current, payment) => {
    if (payment.id === excludePaymentId) return current;
    const receipt = payment.receiptNo ?? "";
    if (!receipt.startsWith(receiptPrefix)) return current;
    return Math.max(current, Number(receipt.slice(receiptPrefix.length)) || 0);
  }, 0);
  return `${receiptPrefix}${String(highest + 1).padStart(4, "0")}`;
}
