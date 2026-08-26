import type { ElectricityBill, Property } from "../types/domain";
import { downloadTableReport, reportDate, reportMoney } from "./downloadTableReport";

export function downloadElectricityReport(property: Property, bills: ElectricityBill[], filters: string[] = []): string {
  const total = bills.reduce((sum, bill) => sum + bill.amount, 0);
  const unpaid = bills.filter((bill) => bill.status === "unpaid").reduce((sum, bill) => sum + bill.amount, 0);
  return downloadTableReport({
    columns: ["Month", "Area", "Due date", "Amount", "Status", "Recorded by", "Note"],
    filename: "electricity-report",
    filters,
    propertyAddress: `${property.address}, ${property.city}`,
    propertyName: property.name,
    rows: bills.map((bill) => [bill.month, bill.area, reportDate(bill.dueDate), reportMoney(bill.amount), bill.status, bill.recordedBy, bill.note ?? "-"]),
    summary: [{ label: "Bills", value: String(bills.length) }, { label: "Total", value: reportMoney(total) }, { label: "Paid", value: reportMoney(total - unpaid) }, { label: "Unpaid", value: reportMoney(unpaid) }],
    title: "Electricity Bills",
  });
}

