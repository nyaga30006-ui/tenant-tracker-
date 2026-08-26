import { useAppNavigation } from "../../../app/NavigationContext";
import { Icon } from "../../../components/ui/Icon";
import { useRooms } from "../../../hooks/useRooms";
import { formatKes } from "../../../lib/format";
import { calculatedRoomStatus, roomBalance } from "../../rooms/roomFinance";

export function CollectionAlerts() {
  const { navigate } = useAppNavigation();
  const { rooms } = useRooms();
  const roomsNeedingCollection = rooms
    .filter((room) => room.tenant && roomBalance(room) > 0)
    .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
  const totalOutstanding = roomsNeedingCollection.reduce((total, room) => total + roomBalance(room), 0);

  return (
    <section className={`unpaid-alert ${roomsNeedingCollection.length ? "unpaid-alert--danger" : "unpaid-alert--clear"}`} aria-label="Rooms needing rent collection">
      <div className="unpaid-alert-title">
        <Icon name={roomsNeedingCollection.length ? "warning" : "check"} size={17} />
        <span>{roomsNeedingCollection.length} Room{roomsNeedingCollection.length === 1 ? "" : "s"} Need Collection</span>
        {roomsNeedingCollection.length > 0 && <strong>{formatKes(totalOutstanding)} outstanding</strong>}
      </div>

      {!roomsNeedingCollection.length && <p className="unpaid-alert-clear-message">Every occupied room is currently settled.</p>}

      {roomsNeedingCollection.length > 0 && (
        <div className="unpaid-room-list">
          {roomsNeedingCollection.map((room) => {
            const status = calculatedRoomStatus(room);
            return (
              <button className={`unpaid-room-pill unpaid-room-pill--${status}`} key={room.id} onClick={() => navigate("rooms")} type="button">
                <span aria-hidden="true">●</span>
                <b>{status === "partial" ? "Part paid" : "Unpaid"}</b>
                <span>· {room.number} · {room.tenant} · {formatKes(roomBalance(room))}</span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
