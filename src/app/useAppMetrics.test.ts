import {describe, expect, it} from "vitest";
import {paymentFixture, roomFixture} from "../test/fixtures";
import {calculateAppMetrics} from "./useAppMetrics";

describe("calculateAppMetrics", () => {
  it("uses confirmed rent received in the selected month against expected monthly rent", () => {
    const metrics = calculateAppMetrics([
      roomFixture({arrears: 5000, credit: 2000, id: "occupied-1", rent: 10000, tenant: "Amina"}),
      roomFixture({id: "occupied-2", rent: 8000, tenant: "Brian"}),
      roomFixture({id: "vacant", rent: 9000, tenant: "", status: "vacant"}),
    ], [
      paymentFixture({amount: 9000, id: "august-rent", paymentType: "rent", receivedAt: "2026-08-03T10:00:00+03:00", status: "confirmed"}),
      paymentFixture({amount: 2000, id: "august-electricity", paymentType: "electricity", receivedAt: "2026-08-04T10:00:00+03:00", status: "confirmed"}),
      paymentFixture({amount: 5000, id: "july-rent", paymentType: "rent", receivedAt: "2026-07-30T10:00:00+03:00", status: "confirmed"}),
      paymentFixture({amount: 3000, id: "pending-rent", paymentType: "rent", receivedAt: "2026-08-05T10:00:00+03:00", status: "pending"}),
    ], "2026-08");

    expect(metrics).toMatchObject({collected: 9000, expected: 18000, occupiedCount: 2, pending: 9000, rate: 50, totalRooms: 3, vacantCount: 1});
  });
});
