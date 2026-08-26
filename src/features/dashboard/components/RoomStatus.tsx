import { useAppNavigation } from "../../../app/NavigationContext";
import { Icon, type IconName } from "../../../components/ui/Icon";
import { useRooms } from "../../../hooks/useRooms";
import { useAppData } from "../../../store/AppDataProvider";

export function RoomStatus() {
  const { navigate } = useAppNavigation();
  const { maintenanceIssues } = useAppData();
  const { rooms } = useRooms();
  const maintenanceRooms = new Set(maintenanceIssues.filter((issue) => issue.status !== "completed" && issue.roomNumber).map((issue) => issue.roomNumber));
  const occupied = rooms.filter((room) => room.tenant).length;
  const vacant = rooms.filter((room) => !room.tenant).length;
  const statuses: Array<{ icon: IconName; label: string; hint: string; page: "rooms" | "maintenance"; value: number; tone: string }> = [
    { icon: "rooms", label: "Occupied Rooms", hint: "Generating rent", page: "rooms", value: occupied, tone: "green" },
    { icon: "building", label: "Vacant Rooms", hint: "Available for letting", page: "rooms", value: vacant, tone: "gold" },
    { icon: "maintenance", label: "Rooms with Open Issues", hint: "Maintenance follow-up", page: "maintenance", value: maintenanceRooms.size, tone: "sage" },
  ];

  return (
    <article className="card dashboard-room-status">
      <header className="card-heading">
        <div className="card-title">Room Status</div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate("rooms")} type="button">View All <Icon name="arrow" size={14} /></button>
      </header>
      <div className="room-status-list">
        {statuses.map((status) => (
          <button className="room-status-row" key={status.label} onClick={() => navigate(status.page)} type="button">
            <div className="bar-row">
              <span><Icon name={status.icon} size={16} />{status.label}</span>
              <strong className={`status-count status-count--${status.tone}`}>{status.value}</strong>
            </div>
            <div className="bar-bg"><span className={`bar-fill bar-fill--${status.tone}`} style={{ width: `${rooms.length ? status.value / rooms.length * 100 : 0}%` }} /></div>
            <small>{status.hint}</small>
          </button>
        ))}
      </div>
    </article>
  );
}
