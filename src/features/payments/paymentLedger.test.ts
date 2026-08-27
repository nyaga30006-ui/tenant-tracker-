import { describe, expect, it } from "vitest";
import { paymentFixture, residencyFixture, roomFixture } from "../../test/fixtures";
import { findDuplicatePaymentReference } from "../../lib/validation";
import { applyPaymentCorrectionToResidency, applyPaymentCorrectionToRoom, applyPaymentToRoom } from "./paymentLedger";

describe("payment recording and corrections", () => {
  it("applies rent, deposit, and electricity payments to separate ledgers", () => {
    expect(applyPaymentToRoom(roomFixture(), "rent", 2500).paid).toBe(2500);
    expect(applyPaymentToRoom(roomFixture({ depositPaid: 1000 }), "deposit", 2000).depositPaid).toBe(3000);
    expect(applyPaymentToRoom(roomFixture({ electricityPaid: 500 }), "electricity", 2000)).toMatchObject({ electricityPaid: 2500, paid: 0 });
  });

  it("reverses the old amount before applying a correction", () => {
    const previous = paymentFixture({ amount: 5000 });
    const corrected = paymentFixture({ amount: 6500, corrected: true });
    const room = applyPaymentCorrectionToRoom(roomFixture({ paid: 5000 }), previous, corrected);
    expect(room.paid).toBe(6500);
    expect(room.status).toBe("partial");
  });

  it("moves corrected values between deposit and rent without corrupting the residency", () => {
    const previous = paymentFixture({ amount: 3000, paymentType: "deposit" });
    const corrected = paymentFixture({ amount: 3000, paymentType: "rent", corrected: true });
    expect(applyPaymentCorrectionToRoom(roomFixture({ depositPaid: 3000 }), previous, corrected)).toMatchObject({ depositPaid: 0, paid: 3000 });
    expect(applyPaymentCorrectionToResidency(residencyFixture({ depositHeld: 3000 }), previous, corrected).depositHeld).toBe(0);
  });

  it("corrects electricity payments without changing rent paid", () => {
    const previous = paymentFixture({ amount: 2500, paymentType: "electricity" });
    const corrected = paymentFixture({ amount: 2000, paymentType: "electricity", corrected: true });
    expect(applyPaymentCorrectionToRoom(roomFixture({ electricityPaid: 2500, paid: 3000 }), previous, corrected)).toMatchObject({ electricityPaid: 2000, paid: 3000 });
  });

  it("does not alter the current room when correcting a former residency", () => {
    const previous = paymentFixture({ residency: "former", residencyId: "old-residency" });
    const corrected = { ...previous, amount: 7000, corrected: true };
    const currentRoom = roomFixture({ paid: 2000 });
    expect(applyPaymentCorrectionToRoom(currentRoom, previous, corrected)).toEqual(currentRoom);
  });

  it("finds duplicate references regardless of spaces or case and can exclude the edited payment", () => {
    const payments = [paymentFixture({ reference: "QWE 123 abc" })];
    expect(findDuplicatePaymentReference(payments, "qwe123ABC")?.id).toBe("payment-1");
    expect(findDuplicatePaymentReference(payments, "qwe123ABC", "payment-1")).toBeUndefined();
  });
});
