import type { Room, RoomStatus } from "../../types/domain";

export const DEFAULT_ELECTRICITY_FEE = 2500;

export function roomElectricityFee(room: Room) {
  return room.electricityDueEnabled ? (room.electricityFee ?? DEFAULT_ELECTRICITY_FEE) : 0;
}

export function roomElectricityDue(room: Room) {
  return Math.max(0, roomElectricityFee(room) - (room.electricityPaid ?? 0));
}

export function roomMonthlyCharge(room: Room) {
  return room.rent;
}

export function roomDepositTarget(room: Room) {
  return room.depositDueEnabled ? (room.depositRequired ?? room.rent) : 0;
}

export function roomDepositDue(room: Room) {
  return Math.max(0, roomDepositTarget(room) - (room.depositPaid ?? 0));
}

export function roomRecurringDue(room: Room) {
  if (room.bookBalanceDue !== undefined) return Math.max(0, room.bookBalanceDue);
  return Math.max(0, roomMonthlyCharge(room) + room.arrears - room.credit);
}

export function roomRecurringBalance(room: Room) {
  if (!room.tenant) return 0;
  if (room.bookBalanceDue !== undefined) return room.bookBalanceDue - room.paid - room.credit;
  return roomRecurringDue(room) - room.paid;
}

export function roomBalance(room: Room) {
  if (!room.tenant) return 0;
  if (room.bookBalanceDue !== undefined) return roomRecurringBalance(room) + roomElectricityDue(room);
  return roomRecurringBalance(room) + roomDepositDue(room) + roomElectricityDue(room);
}

export function calculatedRoomStatus(room: Room): RoomStatus {
  if (!room.tenant) return "vacant";
  const balance = roomRecurringBalance(room);
  if (balance < 0) return "credit";
  if (balance === 0) return "paid";
  if (balance < room.rent) return "partial";
  return "unpaid";
}
