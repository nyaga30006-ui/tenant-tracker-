import type { Room } from "../../types/domain";
import { calculatedRoomStatus, roomRecurringBalance } from "./roomFinance";

export function resetRoomForMonth(room: Room, month: string): Room {
  if (!room.tenant || room.lastResetMonth === month) return room;
  const balanceBeforeReset = roomRecurringBalance(room);
  const next: Room = {
    ...room,
    arrears: Math.max(0, balanceBeforeReset),
    bookBalanceDue: undefined,
    credit: Math.max(0, -balanceBeforeReset),
    lastResetMonth: month,
    paid: 0,
  };
  return { ...next, status: calculatedRoomStatus(next) };
}

export function roomsReadyForReset(rooms: Room[], month: string): Room[] {
  return rooms.filter((room) => Boolean(room.tenant) && room.lastResetMonth !== month);
}

