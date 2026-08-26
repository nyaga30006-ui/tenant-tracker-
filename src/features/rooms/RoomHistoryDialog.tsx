import { Modal } from "../../components/ui/Modal";
import { formatDate, formatKes } from "../../lib/format";
import type { Payment, Room, TenantResidency } from "../../types/domain";

const typeLabels = { deposit: "Deposit", electricity: "Electricity fee", rent: "Rent / balance" };
const methodLabels = { bank: "Bank", cash: "Cash", mpesa: "M-Pesa" };

interface RoomHistoryDialogProps {
  onClose: () => void;
  payments: Payment[];
  residencies: TenantResidency[];
  room: Room;
}

export function RoomHistoryDialog({ onClose, payments, residencies, room }: RoomHistoryDialogProps) {
  const roomPayments = payments
    .filter((payment) => payment.roomId === room.id)
    .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
  const total = roomPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const orderedResidencies = [...residencies].sort((a, b) => b.moveInDate.localeCompare(a.moveInDate));

  return (
    <Modal description={`Occupancies, deposit settlements, and preserved payment activity for ${room.number}.`} onClose={onClose} title={`History — ${room.number}`}>
      <section className="history-summary psum-bar">
        <div className="psum-item"><small className="psum-label">Current tenant</small><strong className="psum-val">{room.tenant || "Vacant"}</strong></div>
        <div className="psum-item"><small className="psum-label">Occupancies</small><strong className="psum-val">{orderedResidencies.length}</strong></div>
        <div className="psum-item"><small className="psum-label">Payments</small><strong className="psum-val">{roomPayments.length}</strong></div>
        <div className="psum-item"><small className="psum-label">Total recorded</small><strong className="psum-val psum-val--green">{formatKes(total)}</strong></div>
      </section>
      <section className="residency-history">
        <header><small>Tenant residency history</small><strong>{orderedResidencies.filter((residency) => residency.status === "former").length} former</strong></header>
        {orderedResidencies.length > 0 && <div className="hist-scroll"><table className="hist-table"><thead><tr><th>Tenant</th><th>Residency</th><th>Status</th><th>Deposit held</th><th>Refunded</th><th>Deducted</th><th>Final balance</th><th>Notes</th></tr></thead><tbody>{orderedResidencies.map((residency) => { const balance = residency.finalBalance ?? 0; return <tr key={residency.id}><td><strong>{residency.tenantName}</strong></td><td>{formatDate(residency.moveInDate)} → {residency.moveOutDate ? formatDate(residency.moveOutDate) : "Present"}</td><td><span className={`residency-status residency-status--${residency.status}`}>{residency.status}</span></td><td>{formatKes(residency.depositHeld)}</td><td>{residency.status === "former" ? formatKes(residency.depositRefunded ?? 0) : "—"}</td><td>{residency.status === "former" ? formatKes(residency.depositDeducted ?? 0) : "—"}</td><td className={balance > 0 ? "balance-text--arrears" : balance < 0 ? "balance-text--credit" : "balance-text--cleared"}>{balance > 0 ? `${formatKes(balance)} due` : balance < 0 ? `${formatKes(balance)} credit` : "Cleared"}</td><td>{[residency.moveInNote, residency.deductionNote, residency.moveOutNote].filter(Boolean).join(" · ") || "—"}</td></tr>; })}</tbody></table></div>}
        {!orderedResidencies.length && <p className="operation-empty">No residency records have been created for this room.</p>}
      </section>
      <div className="card-title">Payment history</div>
      <div className="history-list">
        {roomPayments.map((payment) => (
          <article className="history-entry pay-log" key={payment.id}>
            <div className="pay-log-header"><div><code className="pay-serial">{payment.receiptNo ?? payment.reference}</code><br /><strong>{typeLabels[payment.paymentType ?? "rent"]}</strong></div><strong className="pay-log-amount">{formatKes(payment.amount)}</strong></div>
            <div className="pay-log-meta">{payment.tenant} · {formatDate(payment.receivedAt)} · {methodLabels[payment.method]} · Recorded by {payment.recordedBy ?? "admin"}</div>
            <div className="pay-row-badges"><span className="legacy-tag legacy-tag--type">{typeLabels[payment.paymentType ?? "rent"]}</span><span className="legacy-tag legacy-tag--method">{methodLabels[payment.method]}</span><em className={`payment-residency payment-residency--${payment.residency ?? "current"}`}>{payment.residency ?? "current"}</em></div>
          </article>
        ))}
        {!roomPayments.length && <div className="feature-empty"><strong>No payment history yet</strong><p>New payments for this room will appear here.</p></div>}
      </div>
      <footer className="modal-actions"><button className="button button--primary btn btn-primary" onClick={onClose} type="button">Done</button></footer>
    </Modal>
  );
}
