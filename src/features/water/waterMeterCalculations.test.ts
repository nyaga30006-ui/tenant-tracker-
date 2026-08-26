import { describe, expect, it } from "vitest";
import { calculateMeterCharge, validateWaterMeterReading } from "./waterMeterCalculations";

describe("water meter calculations", () => {
  it("calculates usage and charge from consecutive readings", () => {
    expect(calculateMeterCharge(1250.4, 1290.9, 85)).toEqual({ consumptionM3: 40.5, amountDue: 3442.5 });
  });

  it("rejects rollover-like lower readings, duplicate months, future dates, and invalid rates", () => {
    const base = { currentReadingM3: 1290, existingBillingMonths: [], previousPosition: { readingDate: "2026-07-20", readingM3: 1250 }, ratePerM3: 85, readingDate: "2026-08-20", today: "2026-08-22" };
    expect(validateWaterMeterReading({ ...base, currentReadingM3: 1200 })).toContain("lower");
    expect(validateWaterMeterReading({ ...base, existingBillingMonths: ["2026-08"] })).toContain("already");
    expect(validateWaterMeterReading({ ...base, readingDate: "2026-08-23" })).toContain("future");
    expect(validateWaterMeterReading({ ...base, ratePerM3: 0 })).toContain("rate");
  });
});

