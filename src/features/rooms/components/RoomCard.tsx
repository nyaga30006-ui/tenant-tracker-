import { Icon } from "../../../components/ui/Icon";
import { formatKes } from "../../../lib/format";
import type { Room } from "../../../types/domain";
import { calculatedRoomStatus, roomBalance, roomDepositDue, roomDepositTarget, roomElectricityFee, roomMonthlyCharge } from "../roomFinance";

interface RoomCardProps {
  canEdit: boolean;
  canManageResidency: boolean;
  canRecordPayment: boolean;
  canSetBook: boolean;
  onEdit: (roomId: string) => void;
  onHistory: (roomId: string) => void;
  onMoveIn: (roomId: string) => void;
  onMoveOut: (roomId: string) => void;
  onRecordPayment: (roomId: string) => void;
  onSetBook: (roomId: string) => void;
  room: Room;
}

const statusLabels = { paid: "✓ Paid", partial: "◐ Part paid", unpaid: "X Unpaid", credit: "+ Credit", vacant: "○ Vacant" };
const roomStatusClasses = { credit: "over-room", paid: "paid-room", partial: "partial-room", unpaid: "unpaid-room", vacant: "vacant" };
const badgeStatusClasses = { credit: "badge-over", paid: "badge-paid", partial: "badge-progress", unpaid: "badge-unpaid", vacant: "badge-vacant" };

export function RoomCard({ canEdit, canManageResidency, canRecordPayment, canSetBook, onEdit, onHistory, onMoveIn, onMoveOut, onRecordPayment, onSetBook, room }: RoomCardProps) {
  const status = calculatedRoomStatus(room);
  const electricity = roomElectricityFee(room);
  const monthlyDue = roomMonthlyCharge(room);
  const balance = roomBalance(room);
  const depositTarget = roomDepositTarget(room);
  const depositPaid = room.depositPaid ?? 0;
  const depositDue = roomDepositDue(room);
  const isOccupied = Boolean(room.tenant);

  return (
    <article className={`room-card ${roomStatusClasses[status]}`}>
      <header className="room-card-header">
        <div className="room-card-num"><Icon name="rooms" size={19} />{room.number}</div>
        <span className={`badge ${badgeStatusClasses[status]}`}>{statusLabels[status]}</span>
      </header>

      <section className="room-card-body">
        <div className="rci"><div className="rci-label">Tenant</div><div className="rci-val">{room.tenant || "Vacant"}</div></div>
        <div className="rci"><div className="rci-label">Floor</div><div className="rci-val">{room.floor === 0 ? "Ground Floor" : `Floor ${room.floor}`}</div></div>
        <div className="rci">
          <div className="rci-label">Monthly Due</div>
          <div className="rci-val">{formatKes(monthlyDue)} {room.arrears > 0 && <em className="diff-neg">(+{room.arrears.toLocaleString("en-KE")} arrears)</em>}</div>
          <span className="rci-note">{electricity ? `Rent ${room.rent.toLocaleString("en-KE")} + electricity ${electricity.toLocaleString("en-KE")}` : `Rent ${room.rent.toLocaleString("en-KE")} only`}</span>
        </div>
        <div className="rci"><div className="rci-label">Paid This Month</div><div className="rci-val">{formatKes(room.paid)} {room.credit > 0 && <em className="diff-pos">(+{room.credit.toLocaleString("en-KE")} credit)</em>}</div></div>
        <div className="rci">
          <div className="rci-label">Deposit</div>
          <div className="rci-val">{formatKes(depositPaid)} / {formatKes(depositTarget)}</div>
          <span className="rci-note">{room.depositDueEnabled ? (depositDue > 0 ? `(${formatKes(depositDue)} due)` : "(fully paid)") : "(not due)"}</span>
        </div>
        <div className="rci">
          <div className="rci-label">Balance</div>
          <div className={`rci-val ${balance > 0 ? "diff-neg" : balance < 0 ? "diff-pos" : "diff-zero"}`}>{balance > 0 ? `-${formatKes(balance)}` : balance < 0 ? `+${formatKes(Math.abs(balance))}` : "KES 0"}</div>
        </div>
      </section>

      <footer className="room-card-actions">
        {canEdit && <button className="btn btn-ghost btn-sm" onClick={() => onEdit(room.id)} type="button"><Icon name="edit" size={15} />Edit</button>}
        {!isOccupied && canManageResidency && <button className="btn btn-green btn-sm" onClick={() => onMoveIn(room.id)} type="button"><Icon name="moveIn" size={16} />Move tenant in</button>}
        {isOccupied && canRecordPayment && <button className="btn btn-green btn-sm" onClick={() => onRecordPayment(room.id)} type="button"><Icon name="payment" size={16} />Record Payment</button>}
        <button className="btn btn-ghost btn-sm room-history-button" onClick={() => onHistory(room.id)} type="button"><Icon name="history" size={16} />History</button>
        {isOccupied && canSetBook && <button className="btn btn-orange btn-sm" onClick={() => onSetBook(room.id)} type="button"><Icon name="book" size={16} />Set the Book</button>}
        {isOccupied && canManageResidency && <button className="btn btn-danger btn-sm" onClick={() => onMoveOut(room.id)} type="button"><Icon name="moveOut" size={16} />Move tenant out</button>}
      </footer>
    </article>
  );
}
