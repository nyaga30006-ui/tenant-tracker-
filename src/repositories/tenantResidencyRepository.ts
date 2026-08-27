import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "../firebase/app";
import type { Payment, Room, TenantResidency } from "../types/domain";

const manageTenantResidency = () => httpsCallable(getFirebaseFunctions(), "manageTenantResidency");

export const tenantResidencyRepository = {
  async moveIn(propertyId: string, residency: TenantResidency, roomAfterMoveIn: Room): Promise<void> {
    await manageTenantResidency()({ action: "moveIn", propertyId, residency, room: roomAfterMoveIn });
  },

  async moveOut(propertyId: string, residency: TenantResidency, roomAfterMoveOut: Room, formerPayments: Payment[]): Promise<void> {
    await manageTenantResidency()({ action: "moveOut", paymentIds: formerPayments.map((payment) => payment.id), propertyId, residency, room: roomAfterMoveOut });
  },
};
