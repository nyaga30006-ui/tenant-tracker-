import type { Room } from "../../types/domain";
import { calculatedRoomStatus, roomRecurringDue } from "./roomFinance";

export function resetRoomForMonth(room: Room, month: string): Room {
  if (!room.tenant || room.lastResetMonth === month) return room;
  const previousDue = roomRecurringDue(room);
  const available = room.paid + room.credit;
  const next: Room = {
    ...room,
    arrears: Math.max(0, previousDue - available),
    bookBalanceDue: undefined,
    credit: Math.max(0, available - previousDue),
    lastResetMonth: month,
    paid: 0,
  };
  return { ...next, status: calculatedRoomStatus(next) };
}

export function roomsReadyForReset(rooms: Room[], month: string): Room[] {
  return rooms.filter((room) => Boolean(room.tenant) && room.lastResetMonth !== month);
}

