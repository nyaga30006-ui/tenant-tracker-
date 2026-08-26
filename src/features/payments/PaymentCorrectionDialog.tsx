import { useState, type FormEvent } from "react";
import { Modal } from "../../components/ui/Modal";
import { nextPaymentReceipt } from "../../lib/receiptNumbers";
import { findDuplicatePaymentReference, validateDate } from "../../lib/validation";
import type { Payment, PaymentMethod, PaymentProvider, PaymentType } from "../../types/domain";

interface PaymentCorrectionDialogProps {
  onClose: () => void;
  onSaved: (payment: Payment) => void;
  payment: Payment;
  payments: Payment[];
  receiptPrefix: string;
}

function providerFor(method: PaymentMethod): PaymentProvider {
  if (method === "bank") return "kcb";
  if (method === "mpesa") return "mpesa";
  return "manual";
}

export function PaymentCorrectionDialog({ onClose, onSaved, payment, payments, receiptPrefix }: PaymentCorrectionDialogProps) {
  const [amount, setAmount] = useState(String(payment.amount));
  const [paymentType, setPaymentType] = useState<PaymentType>(payment.paymentType ?? "rent");
  const [method, setMethod] = useState<PaymentMethod>(payment.method);
  const [receivedAt, setReceivedAt] = useState(payment.receivedAt.slice(0, 10));
  const [reference, setReference] = useState(payment.reference);
  const [note, setNote] = useState(payment.note ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericAmount = Number(amount);
    const today = new Date().toISOString().slice(0, 10);
    const dateError = validateDate(receivedAt, "Payment date", { max: today });
    const duplicate = method !== "cash" ? findDuplicatePaymentReference(payments, reference, payment.id) : undefined;
    if (dateError) {
      setError(dateError);
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter a corrected amount above zero.");
      return;
    }
    if (method !== "cash" && !reference.trim()) {
      setError("Enter the M-Pesa or bank reference for this payment.");
      return;
    }
    if (duplicate) {
      setError(`Reference ${reference.trim()} already belongs to ${duplicate.receiptNo ?? duplicate.reference}.`);
      return;
    }
    if (!reason.trim()) {
      setError("Explain why this payment is being corrected.");
      return;
    }
    const expectedReceiptPrefix = `${receiptPrefix}-${receivedAt.slice(0, 7).replace("-", "")}-`;
    onSaved({
      ...payment,
      amount: numericAmount,
      corrected: true,
      method,
      note: [note.trim(), `Correction: ${reason.trim()}`].filter(Boolean).join(" · "),
      paymentType,
      provider: providerFor(method),
      receiptNo: payment.receiptNo?.startsWith(expectedReceiptPrefix)
        ? payment.receiptNo
        : nextPaymentReceipt(receivedAt, payments, receiptPrefix, payment.id),
      receivedAt: `${receivedAt}T12:00:00+03:00`,
      reference: reference.trim(),
    });
  }

  return (
    <Modal description={`Update ${payment.receiptNo ?? payment.reference}. The record will remain visibly marked as corrected.`} onClose={onClose} title="Correct payment">
      <form className="modal-form" onSubmit={submit}>
        <label className="field">Payment type<select onChange={(event) => setPaymentType(event.target.value as PaymentType)} value={paymentType}><option value="rent">Rent / balance</option><option value="electricity">Electricity fee</option><option value="deposit">Deposit</option></select></label>
        <label className="field">Amount (KES)<input min="1" onChange={(event) => setAmount(event.target.value)} required type="number" value={amount} /></label>
        <label className="field">Method<select onChange={(event) => setMethod(event.target.value as PaymentMethod)} value={method}><option value="bank">Bank</option><option value="mpesa">M-Pesa</option><option value="cash">Cash</option></select></label>
        <label className="field">Date received<input max={new Date().toISOString().slice(0, 10)} onChange={(event) => { setReceivedAt(event.target.value); setError(""); }} required type="date" value={receivedAt} /></label>
        <label className="field field--wide">Reference<input onChange={(event) => { setReference(event.target.value); setError(""); }} required={method !== "cash"} value={reference} /></label>
        <label className="field field--wide">Note<textarea onChange={(event) => setNote(event.target.value)} rows={2} value={note} /></label>
        <label className="field field--wide">Reason for correction<textarea autoFocus onChange={(event) => { setReason(event.target.value); setError(""); }} placeholder="Explain what changed" required rows={3} value={reason} /></label>
        {error && <p className="form-error field--wide" role="alert">{error}</p>}
        <footer className="modal-actions"><button className="button button--secondary" onClick={onClose} type="button">Cancel</button><button className="button button--primary" type="submit">Save correction</button></footer>
      </form>
    </Modal>
  );
}
