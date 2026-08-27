import { useMemo } from "react";
import { usePayments } from "../../hooks/usePayments";
import { useRooms } from "../../hooks/useRooms";
import { useTenantResidencies } from "../../hooks/useTenantResidencies";
import { roomRecurringBalance } from "../rooms/roomFinance";
import type { Payment, Room, TenantResidency } from "../../types/domain";

export function calculateLifetimeCollectionMetrics(payments: Payment[], rooms: Room[], tenantResidencies: TenantResidency[]) {
  const confirmedCollections = payments.filter((payment) =>
    payment.status === "confirmed" && (payment.paymentType ?? "rent") !== "deposit",
  );
  const depositAppliedToBalances = tenantResidencies
    .filter((residency) => residency.status === "former")
    .reduce((total, residency) => total + (residency.depositAppliedToBalance ?? 0), 0);
  const collected = confirmedCollections.reduce((total, payment) => total + payment.amount, 0) + depositAppliedToBalances;
  const positions = [
    ...rooms.filter((room) => room.tenant).map(roomRecurringBalance),
    ...tenantResidencies.filter((residency) => residency.status === "former").map((residency) => residency.finalBalance ?? 0),
  ];
  const dueAndArrears = positions.reduce((total, balance) => total + Math.max(0, balance), 0);
  const credits = positions.reduce((total, balance) => total + Math.max(0, -balance), 0);

  // Collections plus every current/former debt position reconstructs the
  // property's full charged amount without counting carried arrears twice.
  const totalCharged = Math.max(0, collected + dueAndArrears - credits);
  const uncappedRate = totalCharged > 0 ? collected / totalCharged * 100 : 0;
  const rate = Math.min(100, Math.max(0, Math.round(uncappedRate)));

  return {collected, credits, depositAppliedToBalances, dueAndArrears, paymentCount: confirmedCollections.length, rate, totalCharged};
}

export function useLifetimeCollectionMetrics() {
  const { payments } = usePayments();
  const { rooms } = useRooms();
  const { tenantResidencies } = useTenantResidencies();

  return useMemo(() => calculateLifetimeCollectionMetrics(payments, rooms, tenantResidencies), [payments, rooms, tenantResidencies]);
}
