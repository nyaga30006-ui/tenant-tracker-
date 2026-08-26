import { describe, expect, it } from "vitest";
import { paymentFixture } from "../test/fixtures";
import { nextPaymentReceipt, propertyReceiptPrefix } from "./receiptNumbers";

describe("receipt numbers", () => {
  it("creates a stable property prefix", () => {
    expect(propertyReceiptPrefix("Nyaga Property")).toBe("NYG");
  });

  it("always advances beyond the highest receipt in the selected month", () => {
    const payments = [
      paymentFixture({ id: "a", receiptNo: "NYG-202608-0009" }),
      paymentFixture({ id: "b", receiptNo: "NYG-202608-0002" }),
      paymentFixture({ id: "c", receiptNo: "NYG-202607-0099" }),
    ];
    expect(nextPaymentReceipt("2026-08-22", payments, "NYG")).toBe("NYG-202608-0010");
  });
});

