import type { Payment, PaymentType, Room, TenantResidency } from "../../types/domain";
import { calculatedRoomStatus } from "../rooms/roomFinance";

function isDeposit(type: PaymentType | undefined): boolean {
  return type === "deposit";
}

export function applyPaymentToRoom(room: Room, paymentType: PaymentType, amount: number): Room {
  const next = paymentType === "deposit"
    ? { ...room, depositPaid: (room.depositPaid ?? 0) + amount }
    : { ...room, paid: room.paid + amount };
  return { ...next, status: calculatedRoomStatus(next) };
}

export function applyPaymentCorrectionToRoom(room: Room, previous: Payment, corrected: Payment): Room {
  const residencyId = corrected.residencyId ?? previous.residencyId;
  const isFormer = (corrected.residency ?? previous.residency ?? "current") === "former";
  if (room.id !== corrected.roomId || isFormer || (residencyId && room.activeResidencyId !== residencyId)) return room;

  let paid = room.paid;
  let depositPaid = room.depositPaid ?? 0;
  if (isDeposit(previous.paymentType)) depositPaid = Math.max(0, depositPaid - previous.amount);
  else paid = Math.max(0, paid - previous.amount);
  if (isDeposit(corrected.paymentType)) depositPaid += corrected.amount;
  else paid += corrected.amount;

  const next = { ...room, depositPaid, paid };
  return { ...next, status: calculatedRoomStatus(next) };
}

export function applyPaymentCorrectionToResidency(residency: TenantResidency, previous: Payment, corrected: Payment): TenantResidency {
  const residencyId = corrected.residencyId ?? previous.residencyId;
  if (!residencyId || residency.id !== residencyId) return residency;
  const previousDeposit = isDeposit(previous.paymentType) ? previous.amount : 0;
  const nextDeposit = isDeposit(corrected.paymentType) ? corrected.amount : 0;
  const previousCollection = isDeposit(previous.paymentType) ? 0 : previous.amount;
  const nextCollection = isDeposit(corrected.paymentType) ? 0 : corrected.amount;
  const collectionDifference = nextCollection - previousCollection;
  return {
    ...residency,
    depositHeld: Math.max(0, residency.depositHeld + nextDeposit - previousDeposit),
    finalBalance: residency.status === "former" ? (residency.finalBalance ?? 0) - collectionDifference : residency.finalBalance,
  };
}

