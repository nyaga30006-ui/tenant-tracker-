import { Icon } from "../../../components/ui/Icon";
import { formatDate, formatKes } from "../../../lib/format";
import type { Payment, Room } from "../../../types/domain";

const typeLabels = { deposit: "Deposit", electricity: "Electricity Fee", rent: "Rent / Balance" };
const methodLabels = { bank: "Bank", cash: "Cash", mpesa: "M-Pesa" };
const methodSymbols: Record<Payment["method"], string> = { bank: "🏦", cash: "💵", mpesa: "📱" };

interface PaymentCardProps {
  canCorrect: boolean;
  onCorrect: (paymentId: string) => void;
  payment: Payment;
  room?: Room;
}

export function PaymentCard({ canCorrect, onCorrect, payment, room }: PaymentCardProps) {
  const residency = payment.residency ?? "current";

  return (
    <article className="pay-row">
      <div className="pay-row-top">
        <div className="pay-row-identity">
          <span className="pay-serial">{payment.receiptNo ?? payment.reference}</span>
          <div><span className="pay-row-room">{room?.number ?? "Former room"}</span><span className="pay-row-tenant"> · {payment.tenant}</span></div>
        </div>
        <span className="pay-row-amount">{methodSymbols[payment.method]} {formatKes(payment.amount)}</span>
      </div>

      <div className="pay-row-meta"><Icon name="calendar" size={14} /><span>{formatDate(payment.receivedAt)}</span><i>·</i><Icon name="user" size={14} /><span>{payment.recordedBy ?? "admin"}</span>{payment.reference && <><i>·</i><span>Ref: <strong>{payment.reference}</strong></span></>}{payment.note && <><i>·</i><span>“{payment.note}”</span></>}</div>

      <footer className="pay-row-badges">
        <span className="badge badge-type">{typeLabels[payment.paymentType ?? "rent"]}</span>
        <span className={`badge badge-${payment.method}`}>{methodLabels[payment.method]}</span>
        <span className={`badge badge-${residency}`}><Icon name="rooms" size={13} />{residency}</span>
        {payment.corrected && <span className="badge badge-former">Corrected</span>}
        {canCorrect && <button className="btn btn-orange btn-sm" onClick={() => onCorrect(payment.id)} type="button"><Icon name="edit" size={14} />Correct</button>}
      </footer>
    </article>
  );
}
