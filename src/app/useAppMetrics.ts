import { useMemo } from "react";
import { calculatedRoomStatus } from "../features/rooms/roomFinance";
import { usePayments } from "../hooks/usePayments";
import { useRooms } from "../hooks/useRooms";
import type { Payment, Room } from "../types/domain";

export function nairobiMonthKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en", {month: "2-digit", timeZone: "Africa/Nairobi", year: "numeric"}).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  return `${year}-${month}`;
}

export function calculateAppMetrics(rooms: Room[], payments: Payment[], monthKey: string) {
  const occupiedRooms = rooms.filter((room) => room.tenant);
  const vacantRooms = rooms.filter((room) => calculatedRoomStatus(room) === "vacant");
  const expected = occupiedRooms.reduce((total, room) => total + room.rent, 0);
  const collected = payments
    .filter((payment) => payment.status === "confirmed"
      && (payment.paymentType ?? "rent") === "rent"
      && payment.receivedAt.slice(0, 7) === monthKey)
    .reduce((total, payment) => total + payment.amount, 0);
  const pending = Math.max(0, expected - collected);
  const rate = expected ? Math.round(collected / expected * 100) : 0;

  return {collected, expected, occupiedCount: occupiedRooms.length, pending, rate, totalRooms: rooms.length, vacantCount: vacantRooms.length};
}

export function useAppMetrics() {
  const { rooms } = useRooms();
  const { payments } = usePayments();

  return useMemo(() => calculateAppMetrics(rooms, payments, nairobiMonthKey()), [payments, rooms]);
}
