import {describe, expect, it} from "vitest";
import {paymentFixture, residencyFixture, roomFixture} from "../../test/fixtures";
import {calculateLifetimeCollectionMetrics} from "./useLifetimeCollectionMetrics";

describe("calculateLifetimeCollectionMetrics", () => {
  it("includes all current-room and former-residency debt in the property collection rate", () => {
    const metrics = calculateLifetimeCollectionMetrics([
      paymentFixture({amount: 6000, id: "rent", paymentType: "rent", status: "confirmed"}),
      paymentFixture({amount: 1000, id: "electricity", paymentType: "electricity", status: "confirmed"}),
      paymentFixture({amount: 2000, id: "deposit", paymentType: "deposit", status: "confirmed"}),
      paymentFixture({amount: 9000, id: "pending", paymentType: "rent", status: "pending"}),
    ], [
      roomFixture({arrears: 2000, credit: 1000, paid: 6000, rent: 10000, tenant: "Current Tenant"}),
    ], [
      residencyFixture({depositAppliedToBalance: 500, finalBalance: 2000, id: "former-debt", status: "former"}),
      residencyFixture({finalBalance: -500, id: "former-credit", status: "former"}),
    ]);

    expect(metrics).toMatchObject({collected: 7500, credits: 500, dueAndArrears: 7000, paymentCount: 2, rate: 54, totalCharged: 14000});
  });
});
