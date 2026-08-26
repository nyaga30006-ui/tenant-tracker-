import type { Property, WaterConfiguration, WaterMeter, WaterMeterReading, WaterPurchaseBill } from "../types/domain";
import { downloadTableReport, reportDate, reportMoney } from "./downloadTableReport";

export function downloadWaterReport(property: Property, configuration: WaterConfiguration, meters: WaterMeter[], readings: WaterMeterReading[], bills: WaterPurchaseBill[], filters: string[] = []): string {
  if (configuration.mode === "seller") {
    const billed = readings.reduce((sum, reading) => sum + reading.amountDue, 0);
    const paid = readings.reduce((sum, reading) => sum + Math.min(reading.amountPaid, reading.amountDue), 0);
    return downloadTableReport({
      columns: ["Month", "Customer", "Meter", "Previous", "Current", "Usage m3", "Rate/m3", "Billed", "Paid", "Due"],
      filename: "water-meter-sales-report",
      filters,
      propertyAddress: `${property.address}, ${property.city}`,
      propertyName: property.name,
      rows: readings.map((reading) => { const meter = meters.find((item) => item.id === reading.meterId); return [reading.billingMonth, meter?.customerName ?? "Unknown", meter?.meterNumber ?? "Unknown", reading.previousReadingM3, reading.currentReadingM3, reading.consumptionM3, reportMoney(reading.ratePerM3), reportMoney(reading.amountDue), reportMoney(reading.amountPaid), reportMoney(Math.max(0, reading.amountDue - reading.amountPaid))]; }),
      summary: [{ label: "Meters", value: String(meters.length) }, { label: "Readings", value: String(readings.length) }, { label: "Billed", value: reportMoney(billed) }, { label: "Collected", value: reportMoney(paid) }, { label: "Outstanding", value: reportMoney(Math.max(0, billed - paid)) }],
      title: "Metered Water Sales",
    });
  }

  const total = bills.reduce((sum, bill) => sum + bill.amount, 0);
  const unpaid = bills.filter((bill) => bill.status === "unpaid").reduce((sum, bill) => sum + bill.amount, 0);
  return downloadTableReport({
    columns: ["Month", "Supplier", "Due date", "Reference", "Volume m3", "Amount", "Status"],
    filename: "water-purchases-report",
    filters,
    propertyAddress: `${property.address}, ${property.city}`,
    propertyName: property.name,
    rows: bills.map((bill) => [bill.month, bill.supplier, reportDate(bill.dueDate), bill.reference ?? "-", bill.volumeM3 ?? "-", reportMoney(bill.amount), bill.status]),
    summary: [{ label: "Bills", value: String(bills.length) }, { label: "Total", value: reportMoney(total) }, { label: "Paid", value: reportMoney(total - unpaid) }, { label: "Unpaid", value: reportMoney(unpaid) }],
    title: "Purchased Water Bills",
  });
}

