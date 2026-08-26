import type { Payment, Property, Room } from "../types/domain";
import { downloadTableReport, reportDate, reportMoney } from "./downloadTableReport";

export function downloadPaymentsReport(property: Property, payments: Payment[], rooms: Room[], filters: string[] = []): string {
  const total = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const rent = payments.filter((payment) => (payment.paymentType ?? "rent") === "rent").reduce((sum, payment) => sum + payment.amount, 0);
  const electricity = payments.filter((payment) => payment.paymentType === "electricity").reduce((sum, payment) => sum + payment.amount, 0);
  const deposits = payments.filter((payment) => payment.paymentType === "deposit").reduce((sum, payment) => sum + payment.amount, 0);
  return downloadTableReport({
    columns: ["Date", "Receipt", "Room", "Tenant", "Type", "Method", "Reference", "Amount", "Residency"],
    filename: "payments-report",
    filters,
    propertyAddress: `${property.address}, ${property.city}`,
    propertyName: property.name,
    rows: payments.map((payment) => [reportDate(payment.receivedAt), payment.receiptNo ?? "-", rooms.find((room) => room.id === payment.roomId)?.number ?? "Unknown", payment.tenant, payment.paymentType ?? "rent", payment.method, payment.reference || "-", reportMoney(payment.amount), payment.residency ?? "current"]),
    summary: [{ label: "Records", value: String(payments.length) }, { label: "Total", value: reportMoney(total) }, { label: "Rent", value: reportMoney(rent) }, { label: "Electricity", value: reportMoney(electricity) }, { label: "Deposits", value: reportMoney(deposits) }],
    title: "Payment Records",
  });
}

