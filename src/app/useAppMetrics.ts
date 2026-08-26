import { useMemo } from "react";
import { calculatedRoomStatus, roomRecurringDue } from "../features/rooms/roomFinance";
import { useRooms } from "../hooks/useRooms";

export function useAppMetrics() {
  const { rooms } = useRooms();

  return useMemo(() => {
    const occupiedRooms = rooms.filter((room) => room.tenant);
    const vacantRooms = rooms.filter((room) => calculatedRoomStatus(room) === "vacant");
    const expected = occupiedRooms.reduce((total, room) => total + roomRecurringDue(room), 0);
    const collected = occupiedRooms.reduce((total, room) => total + Math.min(room.paid, roomRecurringDue(room)), 0);
    const pending = Math.max(0, expected - collected);
    const rate = expected ? Math.round(collected / expected * 100) : 0;

    return {
      collected,
      expected,
      occupiedCount: occupiedRooms.length,
      pending,
      rate,
      totalRooms: rooms.length,
      vacantCount: vacantRooms.length,
    };
  }, [rooms]);
}
