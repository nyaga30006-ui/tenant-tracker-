import { calculatedRoomStatus, roomBalance, roomElectricityDue } from "../features/rooms/roomFinance";
import type { Property, Room } from "../types/domain";
import { downloadTableReport, reportMoney } from "./downloadTableReport";

export function downloadRoomsReport(property: Property, rooms: Room[], filters: string[] = []): string {
  const outstanding = rooms.reduce((sum, room) => sum + Math.max(0, roomBalance(room)), 0);
  return downloadTableReport({
    columns: ["Room", "Tenant", "Floor", "Rent", "Paid", "Arrears", "Deposit", "Electricity due", "Balance", "Status"],
    filename: "rooms-report",
    filters,
    propertyAddress: `${property.address}, ${property.city}`,
    propertyName: property.name,
    rows: rooms.map((room) => [room.number, room.tenant || "Vacant", room.floor === 0 ? "Ground" : `Floor ${room.floor}`, reportMoney(room.rent), reportMoney(room.paid), reportMoney(room.arrears), reportMoney(room.depositPaid ?? 0), reportMoney(roomElectricityDue(room)), reportMoney(roomBalance(room)), calculatedRoomStatus(room)]),
    summary: [{ label: "Rooms", value: String(rooms.length) }, { label: "Occupied", value: String(rooms.filter((room) => room.tenant).length) }, { label: "Vacant", value: String(rooms.filter((room) => !room.tenant).length) }, { label: "Outstanding", value: reportMoney(outstanding) }],
    title: "Room Account Report",
  });
}
