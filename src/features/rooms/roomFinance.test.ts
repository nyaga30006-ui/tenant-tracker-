import { describe, expect, it } from "vitest";
import { roomFixture } from "../../test/fixtures";
import { calculatedRoomStatus, roomBalance, roomDepositDue, roomElectricityDue, roomMonthlyCharge, roomRecurringBalance } from "./roomFinance";

describe("room balances and statuses", () => {
  it("calculates rent, arrears, deposit, and part-payment correctly", () => {
    const room = roomFixture({ arrears: 1000, depositDueEnabled: true, depositPaid: 2000, depositRequired: 7500, paid: 3000 });
    expect(roomRecurringBalance(room)).toBe(5500);
    expect(roomDepositDue(room)).toBe(5500);
    expect(roomBalance(room)).toBe(11000);
    expect(calculatedRoomStatus(room)).toBe("partial");
  });

  it("treats vacant, cleared, and credit rooms distinctly", () => {
    expect(calculatedRoomStatus(roomFixture({ activeResidencyId: undefined, tenant: "" }))).toBe("vacant");
    expect(calculatedRoomStatus(roomFixture({ paid: 7500 }))).toBe("paid");
    expect(calculatedRoomStatus(roomFixture({ paid: 8000 }))).toBe("credit");
  });

  it("uses the remaining rent balance to distinguish unpaid from part paid", () => {
    expect(calculatedRoomStatus(roomFixture({ arrears: 7500, paid: 1000 }))).toBe("unpaid");
    expect(calculatedRoomStatus(roomFixture({ arrears: 1000, paid: 1000 }))).toBe("unpaid");
    expect(calculatedRoomStatus(roomFixture({ arrears: 1000, paid: 1001 }))).toBe("partial");
  });

  it("keeps deposit balances separate from the rent status", () => {
    expect(calculatedRoomStatus(roomFixture({ depositDueEnabled: true, depositPaid: 0, depositRequired: 7500, paid: 7500 }))).toBe("paid");
  });

  it("treats electricity as a separate one-time charge", () => {
    const room = roomFixture({ electricityDueEnabled: true, electricityFee: 2500, electricityPaid: 1000, paid: 7500 });
    expect(roomMonthlyCharge(room)).toBe(7500);
    expect(roomElectricityDue(room)).toBe(1500);
    expect(roomBalance(room)).toBe(1500);
    expect(calculatedRoomStatus(room)).toBe("paid");
  });

  it("uses an opening book balance without adding monthly rent again", () => {
    const room = roomFixture({ bookBalanceDue: 12000, paid: 2000, rent: 7500 });
    expect(roomRecurringBalance(room)).toBe(10000);
    expect(roomBalance(room)).toBe(10000);
  });
});
