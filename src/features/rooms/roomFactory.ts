import type { Room } from "../../types/domain";

export const MAX_PROPERTY_ROOMS = 500;

export function normaliseRoomCount(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_PROPERTY_ROOMS, Math.max(1, Math.floor(value)));
}

export function createVacantRooms(value: number): Room[] {
  const roomCount = normaliseRoomCount(value);
  const numberWidth = Math.max(2, String(roomCount).length);

  return Array.from({ length: roomCount }, (_, index) => ({
    arrears: 0,
    credit: 0,
    depositDueEnabled: false,
    depositPaid: 0,
    depositRequired: 0,
    electricityDueEnabled: false,
    electricityFee: 2500,
    electricityPaid: 0,
    floor: 0,
    id: crypto.randomUUID(),
    number: `Room ${String(index + 1).padStart(numberWidth, "0")}`,
    paid: 0,
    rent: 0,
    status: "vacant",
    tenant: "",
  }));
}
