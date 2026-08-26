import type { WaterMeter, WaterMeterReading } from "../../types/domain";

export interface WaterMeterPosition {
  readingDate: string;
  readingM3: number;
}

export interface WaterReadingValidationInput {
  currentReadingM3: number;
  existingBillingMonths: string[];
  previousPosition: WaterMeterPosition;
  ratePerM3: number;
  readingDate: string;
  today: string;
}

export function validateWaterMeterReading(input: WaterReadingValidationInput): string {
  const { currentReadingM3, existingBillingMonths, previousPosition, ratePerM3, readingDate, today } = input;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(readingDate) || Number.isNaN(new Date(`${readingDate}T00:00:00Z`).getTime())) return "Enter a valid reading date.";
  if (readingDate <= previousPosition.readingDate) return "The new reading date must be after the previous reading date.";
  if (readingDate > today) return "The reading date cannot be in the future.";
  if (existingBillingMonths.includes(readingDate.slice(0, 7))) return "This meter already has a reading for that billing month.";
  if (!Number.isFinite(currentReadingM3) || currentReadingM3 < previousPosition.readingM3) return "The new reading cannot be lower than the previous meter reading.";
  if (!Number.isFinite(ratePerM3) || ratePerM3 <= 0) return "Enter the confirmed water rate for this reading.";
  return "";
}

export function calculateMeterCharge(previousReadingM3: number, currentReadingM3: number, ratePerM3: number) {
  const consumptionM3 = Math.max(0, currentReadingM3 - previousReadingM3);
  return {
    amountDue: Math.round(consumptionM3 * ratePerM3 * 100) / 100,
    consumptionM3: Math.round(consumptionM3 * 100) / 100,
  };
}

export function readingsForMeter(readings: WaterMeterReading[], meterId: string): WaterMeterReading[] {
  return readings.filter((reading) => reading.meterId === meterId).sort((a, b) => b.readingDate.localeCompare(a.readingDate));
}

export function currentMeterPosition(meter: WaterMeter, readings: WaterMeterReading[]): WaterMeterPosition {
  const latestReading = readingsForMeter(readings, meter.id)[0];
  return latestReading
    ? { readingDate: latestReading.readingDate, readingM3: latestReading.currentReadingM3 }
    : { readingDate: meter.registeredAt, readingM3: meter.openingReadingM3 };
}
