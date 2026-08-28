import {describe, expect, it} from "vitest";
import type {BillingResetRecord} from "../../../types/domain";
import {buildDebtTrend} from "./DebtTrend";

function reset(id: string, resetAt: string, arrearsCarried: number): BillingResetRecord {
  return {arrearsCarried, id, kind: "automatic", month: resetAt.slice(0, 7), recordedBy: "test", resetAt, roomsProcessed: 10};
}

describe("buildDebtTrend", () => {
  it("shows when debt rises from the latest reset to today", () => {
    const trend = buildDebtTrend([reset("july", "2026-07-10", 50000), reset("august", "2026-08-10", 40000)], 147100, new Date("2026-08-28T12:00:00+03:00"));
    expect(trend.direction).toBe("rising");
    expect(trend.change).toBe(107100);
    expect(trend.points.map((point) => point.amount)).toEqual([50000, 40000, 147100]);
  });

  it("shows when debt falls and retains at most five reset snapshots", () => {
    const history = Array.from({length: 7}, (_, index) => reset(String(index), `2026-0${index + 1}-10`, 100000 - index * 5000));
    const trend = buildDebtTrend(history, 30000);
    expect(trend.direction).toBe("falling");
    expect(trend.points).toHaveLength(6);
  });
});
