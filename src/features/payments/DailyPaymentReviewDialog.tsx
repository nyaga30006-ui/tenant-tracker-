import { useMemo, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { formatKes } from "../../lib/format";
import type { Payment } from "../../types/domain";

interface DailyPaymentReviewDialogProps {
  onClose: () => void;
  payments: Payment[];
}

export function DailyPaymentReviewDialog({ onClose, payments }: DailyPaymentReviewDialogProps) {
  const latestDate = payments.map((payment) => payment.receivedAt.slice(0, 10)).sort().at(-1) ?? new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(latestDate);
  const reviewedPayments = useMemo(() => payments.filter((payment) => payment.receivedAt.startsWith(date)), [date, payments]);
  const total = reviewedPayments.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <Modal description="Reconcile the payments received on a selected day by collection method." onClose={onClose} title="Daily payment review">
      <label className="field daily-review-date">Review date<input onChange={(event) => setDate(event.target.value)} type="date" value={date} /></label>
      <section className="history-summary daily-review-summary">
        <div><small>Records</small><strong>{reviewedPayments.length}</strong></div>
        <div><small>Total</small><strong>{formatKes(total)}</strong></div>
        <div><small>M-Pesa</small><strong>{formatKes(reviewedPayments.filter((payment) => payment.method === "mpesa").reduce((sum, payment) => sum + payment.amount, 0))}</strong></div>
        <div><small>Bank</small><strong>{formatKes(reviewedPayments.filter((payment) => payment.method === "bank").reduce((sum, payment) => sum + payment.amount, 0))}</strong></div>
        <div><small>Cash</small><strong>{formatKes(reviewedPayments.filter((payment) => payment.method === "cash").reduce((sum, payment) => sum + payment.amount, 0))}</strong></div>
      </section>
      <div className="history-list">
        {reviewedPayments.map((payment) => <article className="history-entry" key={payment.id}><div><code>{payment.receiptNo}</code><strong>{payment.tenant}</strong><span>{payment.reference} · {payment.recordedBy}</span></div><strong>{formatKes(payment.amount)}</strong></article>)}
        {!reviewedPayments.length && <div className="feature-empty"><strong>No records on this date</strong><p>Choose another date to continue the review.</p></div>}
      </div>
      <footer className="modal-actions"><button className="button button--secondary" onClick={() => window.print()} type="button">Print review</button><button className="button button--primary" onClick={onClose} type="button">Done</button></footer>
    </Modal>
  );
}
