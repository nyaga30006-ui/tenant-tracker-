import { useMemo } from "react";
import { useAppNavigation } from "../../app/NavigationContext";
import { calculatedRoomStatus, roomBalance } from "../../features/rooms/roomFinance";
import { useRooms } from "../../hooks/useRooms";
import { formatKes } from "../../lib/format";
import { useAppData } from "../../store/AppDataProvider";
import type { PageId } from "../../app/navigation";
import { Icon } from "../ui/Icon";

interface NotificationsPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface AppNotification {
  detail: string;
  id: string;
  page: PageId;
  title: string;
}

export function NotificationsPanel({ isOpen, onToggle }: NotificationsPanelProps) {
  const { navigate } = useAppNavigation();
  const { rooms } = useRooms();
  const { electricityBills, maintenanceIssues, readNotificationIds, setReadNotificationIds, waterConfiguration, waterMeterReadings, waterPurchaseBills } = useAppData();

  const notifications = useMemo<AppNotification[]>(() => {
    const next: AppNotification[] = [];
    const rentDue = rooms.filter((room) => ["partial", "unpaid"].includes(calculatedRoomStatus(room)));
    if (rentDue.length) {
      const total = rentDue.reduce((sum, room) => sum + Math.max(0, roomBalance(room)), 0);
      next.push({ detail: `${rentDue.length} occupied rooms have ${formatKes(total)} outstanding.`, id: `rent:${rentDue.map((room) => `${room.id}-${room.paid}-${room.arrears}`).join("|")}`, page: "rooms", title: "Rent collection follow-up" });
    }

    const openIssues = maintenanceIssues.filter((issue) => issue.status !== "completed");
    if (openIssues.length) next.push({ detail: `${openIssues.length} maintenance records still need attention.`, id: `maintenance:${openIssues.map((issue) => `${issue.id}-${issue.status}`).join("|")}`, page: "maintenance", title: "Open maintenance work" });

    const unpaidElectricity = electricityBills.filter((bill) => bill.status === "unpaid");
    if (unpaidElectricity.length) next.push({ detail: `${unpaidElectricity.length} electricity bills total ${formatKes(unpaidElectricity.reduce((sum, bill) => sum + bill.amount, 0))}.`, id: `electricity:${unpaidElectricity.map((bill) => bill.id).join("|")}`, page: "electricity", title: "Electricity payment due" });

    if (waterConfiguration?.mode === "seller") {
      const outstandingMeterReadings = waterMeterReadings.filter((reading) => reading.amountPaid < reading.amountDue);
      const outstandingAmount = outstandingMeterReadings.reduce((sum, reading) => sum + reading.amountDue - reading.amountPaid, 0);
      if (outstandingMeterReadings.length) next.push({ detail: `${outstandingMeterReadings.length} meter bills owe ${formatKes(outstandingAmount)}.`, id: `water-meters:${outstandingMeterReadings.map((reading) => `${reading.id}-${reading.amountPaid}`).join("|")}`, page: "water", title: "Metered water income outstanding" });
    }

    if (waterConfiguration?.mode === "buyer") {
      const unpaidWater = waterPurchaseBills.filter((bill) => bill.status === "unpaid");
      if (unpaidWater.length) next.push({ detail: `${unpaidWater.length} supplier bills total ${formatKes(unpaidWater.reduce((sum, bill) => sum + bill.amount, 0))}.`, id: `water-bills:${unpaidWater.map((bill) => bill.id).join("|")}`, page: "water", title: "Water bill payment due" });
    }
    return next;
  }, [electricityBills, maintenanceIssues, rooms, waterConfiguration, waterMeterReadings, waterPurchaseBills]);

  const unread = notifications.filter((notification) => !readNotificationIds.includes(notification.id));

  function markRead(notification: AppNotification) {
    setReadNotificationIds((current) => [...new Set([...current, notification.id])].slice(-100));
    navigate(notification.page);
    onToggle();
  }

  function markAllRead() {
    setReadNotificationIds((current) => [...new Set([...current, ...notifications.map((notification) => notification.id)])].slice(-100));
  }

  return (
    <div className="premium-notifications">
      <button aria-expanded={isOpen} aria-label={unread.length ? `Notifications, ${unread.length} unread` : "Notifications"} className="premium-bell" onClick={onToggle} type="button"><Icon name="bell" />{unread.length > 0 && <span>{unread.length}</span>}</button>
      {isOpen && (
        <section className="notification-panel">
          <header><div><small>Property updates</small><strong>Notifications</strong></div><button disabled={!unread.length} onClick={markAllRead} type="button">Mark all read</button></header>
          <div className="notification-list">
            {notifications.map((notification) => <button className={readNotificationIds.includes(notification.id) ? "notification-item is-read" : "notification-item"} key={notification.id} onClick={() => markRead(notification)} type="button"><i /><div><strong>{notification.title}</strong><p>{notification.detail}</p><small>Open {notification.page}</small></div><Icon name="arrow" size={16} /></button>)}
            {!notifications.length && <div className="notification-empty"><Icon name="check" /><strong>All clear</strong><small>No property items need attention.</small></div>}
          </div>
          <footer>{unread.length ? `${unread.length} unread update${unread.length === 1 ? "" : "s"}` : "You're all caught up."}</footer>
        </section>
      )}
    </div>
  );
}
