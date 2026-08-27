import { useState, type FormEvent } from "react";
import { Modal } from "../../components/ui/Modal";
import { formatDate, formatKes } from "../../lib/format";
import { nextPaymentReceipt } from "../../lib/receiptNumbers";
import { findDuplicatePaymentReference, validateDate } from "../../lib/validation";
import type { Payment, PaymentMethod, PaymentType, Room, RoomStatus } from "../../types/domain";
import { calculatedRoomStatus, roomDepositDue, roomElectricityDue, roomRecurringBalance, roomRecurringDue } from "../rooms/roomFinance";

export interface RecordedPaymentDraft {
  amount: number;
  method: PaymentMethod;
  note: string;
  paymentType: PaymentType;
  receivedAt: string;
  recordedBy: string;
  receiptNo: string;
  reference: string;
  roomId: string;
  roomName: string;
  tenant: string;
}

interface RecordPaymentDialogProps {
  initialRoomId?: string;
  onClose: () => void;
  onSaved: (payment: RecordedPaymentDraft) => void;
  payments: Payment[];
  preferredMethod: PaymentMethod;
  recordedBy: string;
  receiptPrefix: string;
  rooms: Room[];
}

function todayInNairobi() {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Africa/Nairobi",
    year: "numeric",
  }).format(new Date());
}

const statusLabels: Record<RoomStatus, string> = {
  credit: "Credit",
  paid: "Paid",
  partial: "Part paid",
  unpaid: "Unpaid",
  vacant: "Vacant",
};

const methodLabels: Record<PaymentMethod, string> = { bank: "KCB Bank", cash: "Cash", mpesa: "M-Pesa" };
const paymentTypeLabels: Record<PaymentType, string> = { deposit: "Deposit", electricity: "Electricity fee", rent: "Rent / balance" };

function balanceLabel(balance: number): string {
  if (balance > 0) return `${formatKes(balance)} due`;
  if (balance < 0) return `${formatKes(balance)} credit`;
  return "Cleared";
}

function balanceTone(balance: number): "arrears" | "cleared" | "credit" {
  if (balance > 0) return "arrears";
  if (balance < 0) return "credit";
  return "cleared";
}

function suggestedAmount(room: Room | undefined, paymentType: PaymentType): string {
  if (!room) return "";
  const balance = paymentType === "deposit"
    ? roomDepositDue(room)
    : paymentType === "electricity"
      ? roomElectricityDue(room)
      : Math.max(0, roomRecurringDue(room) - room.paid);
  return balance > 0 ? String(balance) : "";
}

function accountBalance(room: Room, paymentType: PaymentType): number {
  if (paymentType === "deposit") return roomDepositDue(room);
  if (paymentType === "electricity") return roomElectricityDue(room);
  return roomRecurringBalance(room);
}

function accountStatus(room: Room, paymentType: PaymentType): RoomStatus {
  if (paymentType === "rent") return calculatedRoomStatus(room);
  const balance = accountBalance(room, paymentType);
  if (balance === 0) return "paid";
  const paid = paymentType === "deposit" ? (room.depositPaid ?? 0) : (room.electricityPaid ?? 0);
  return paid > 0 ? "partial" : "unpaid";
}

export function RecordPaymentDialog({ initialRoomId, onClose, onSaved, payments, preferredMethod, recordedBy: initialRecordedBy, receiptPrefix, rooms }: RecordPaymentDialogProps) {
  const occupiedRooms = rooms.filter((room) => room.tenant);
  const initialSelectedRoom = rooms.find((room) => room.id === (initialRoomId ?? occupiedRooms[0]?.id));
  const [roomId, setRoomId] = useState(initialSelectedRoom?.id ?? "");
  const [amount, setAmount] = useState(() => suggestedAmount(initialSelectedRoom, "rent"));
  const [paymentType, setPaymentType] = useState<PaymentType>("rent");
  const [method, setMethod] = useState<PaymentMethod>(preferredMethod);
  const [reference, setReference] = useState("");
  const [receivedAt, setReceivedAt] = useState(todayInNairobi());
  const [recordedBy, setRecordedBy] = useState(initialRecordedBy);
  const [note, setNote] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState("");
  const selectedRoom = rooms.find((room) => room.id === roomId);
  const paymentAmount = Number(amount);
  const projectedRoom = selectedRoom
    ? paymentType === "deposit"
      ? { ...selectedRoom, depositPaid: (selectedRoom.depositPaid ?? 0) + paymentAmount }
      : paymentType === "electricity"
        ? { ...selectedRoom, electricityPaid: (selectedRoom.electricityPaid ?? 0) + paymentAmount }
        : { ...selectedRoom, paid: selectedRoom.paid + paymentAmount }
    : undefined;
  const projectedBalance = projectedRoom ? accountBalance(projectedRoom, paymentType) : 0;
  const projectedStatus = projectedRoom ? accountStatus(projectedRoom, paymentType) : "unpaid";
  const balanceBefore = selectedRoom ? accountBalance(selectedRoom, paymentType) : 0;
  const receiptNo = nextPaymentReceipt(receivedAt, payments, receiptPrefix);
  const duplicateReference = method !== "cash" ? findDuplicatePaymentReference(payments, reference) : undefined;
  const possibleDuplicate = payments.some((payment) => payment.roomId === roomId && payment.receivedAt.slice(0, 10) === receivedAt && payment.amount === paymentAmount);
  const warnings = [
    possibleDuplicate ? "The same room, date, and amount already exists. Confirm this is a separate payment." : "",
    paymentType === "rent" && balanceBefore > 0 && projectedBalance < 0 ? `This is ${formatKes(projectedBalance)} above the current balance. The extra money will become credit.` : "",
    paymentType === "deposit" && selectedRoom && paymentAmount > roomDepositDue(selectedRoom) ? `This is ${formatKes(paymentAmount - roomDepositDue(selectedRoom))} above the outstanding deposit. Check the amount before saving.` : "",
    paymentType === "electricity" && selectedRoom && paymentAmount > roomElectricityDue(selectedRoom) ? `This is ${formatKes(paymentAmount - roomElectricityDue(selectedRoom))} above the outstanding electricity fee. Check the amount before saving.` : "",
  ].filter(Boolean);
  const resultTone = balanceTone(projectedBalance);

  function changeRoom(nextRoomId: string) {
    setRoomId(nextRoomId);
    setAmount(suggestedAmount(rooms.find((room) => room.id === nextRoomId), paymentType));
  }

  function changePaymentType(nextPaymentType: PaymentType) {
    setPaymentType(nextPaymentType);
    setAmount(suggestedAmount(selectedRoom, nextPaymentType));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const dateError = validateDate(receivedAt, "Payment date", { max: todayInNairobi() });
    if (!selectedRoom?.tenant || !selectedRoom.activeResidencyId) {
      setError("Choose a room with a current tenant before recording a payment.");
      return;
    }
    if (dateError) {
      setError(dateError);
      return;
    }
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      setError("Enter a payment amount above zero.");
      return;
    }
    if (duplicateReference) {
      setError(`Reference ${reference.trim()} already exists on ${duplicateReference.receiptNo ?? duplicateReference.reference}.`);
      return;
    }
    if (!recordedBy.trim()) {
      setError("Enter who recorded this payment.");
      return;
    }
    setError("");
    setIsConfirming(true);
  }

  function confirmPayment() {
    if (!selectedRoom || duplicateReference || !Number.isFinite(paymentAmount) || paymentAmount <= 0) return;
    onSaved({ amount: paymentAmount, method, note: note.trim(), paymentType, receivedAt, recordedBy: recordedBy.trim(), receiptNo, reference: reference.trim(), roomId, roomName: selectedRoom.number, tenant: selectedRoom.tenant });
  }

  return (
    <Modal description={isConfirming ? "Check the amount and its effect on the room before saving." : "Capture the same payment detail kept in the original property ledger."} onClose={onClose} title={isConfirming ? "Confirm payment" : "Record payment"}>
      {isConfirming && selectedRoom ? (
        <div className="payment-confirmation" aria-live="polite">
          <div className="payment-confirmation__room">
            <div><small>Payment for</small><strong>{selectedRoom.number} · {selectedRoom.tenant}</strong><span>{selectedRoom.floor === 0 ? "Ground Floor" : `Floor ${selectedRoom.floor}`}</span></div>
            <code>{receiptNo}</code>
          </div>

          <section className="payment-confirmation__details" aria-label="Payment details">
            <div><small>Amount</small><strong>{formatKes(paymentAmount)}</strong></div>
            <div><small>Payment type</small><strong>{paymentTypeLabels[paymentType]}</strong></div>
            <div><small>Method</small><strong>{methodLabels[method]}</strong></div>
            <div><small>Reference</small><strong className="payment-reference">{reference.trim() || "Not provided"}</strong></div>
            <div><small>Date received</small><strong>{formatDate(`${receivedAt}T12:00:00+03:00`)}</strong></div>
            <div><small>Recorded by</small><strong>{recordedBy.trim()}</strong></div>
            {note.trim() && <div className="payment-confirmation__note"><small>Note</small><strong>{note.trim()}</strong></div>}
          </section>

          <section className="payment-calculation" aria-label="Balance calculation">
            <div><small>Balance before</small><strong className={`balance-text balance-text--${balanceTone(balanceBefore)}`}>{balanceLabel(balanceBefore)}</strong></div>
            <b>−</b>
            <div><small>This payment</small><strong>{formatKes(paymentAmount)}</strong></div>
            <b>=</b>
            <div><small>Balance after</small><strong className={`balance-text balance-text--${resultTone}`}>{balanceLabel(projectedBalance)}</strong></div>
          </section>

          <section className={`payment-result payment-result--${resultTone}`}>
            <div><small>{resultTone === "arrears" ? "Outstanding after payment" : resultTone === "credit" ? "Credit after payment" : "Account position"}</small><strong>{balanceLabel(projectedBalance)}</strong><span>{resultTone === "arrears" ? "This remains due and will become arrears at the monthly reset if it is not cleared." : resultTone === "credit" ? "The extra amount will be carried forward as credit." : "The current balance is fully cleared."}</span></div>
            <span><small>Status after payment</small><strong className={`legacy-stamp legacy-stamp--${projectedStatus}`}>{statusLabels[projectedStatus]}</strong></span>
          </section>

          {(warnings.length > 0 || duplicateReference) && <section className={`payment-confirmation__warnings${duplicateReference ? " is-blocking" : ""}`}><strong>{duplicateReference ? "Payment cannot be saved" : "Check before saving"}</strong>{duplicateReference && <p>Reference {reference.trim()} already belongs to {duplicateReference.receiptNo ?? duplicateReference.reference}. Use a unique reference or go back and correct it.</p>}{warnings.length > 0 && <ul>{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}</section>}

          <p className="payment-confirmation__notice">Nothing has been recorded yet. Check every detail before saving.</p>
          <footer className="modal-actions"><button className="button button--secondary" onClick={() => setIsConfirming(false)} type="button">Go back</button><button className="button button--primary" disabled={Boolean(duplicateReference)} onClick={confirmPayment} type="button">Confirm & save</button></footer>
        </div>
      ) : (
        <form className="modal-form record-payment-form" onSubmit={submit}>
        <label className="field field--wide">Room and tenant<select onChange={(event) => changeRoom(event.target.value)} value={roomId}>{occupiedRooms.map((room) => <option key={room.id} value={room.id}>{room.number} — {room.tenant}</option>)}</select></label>
        <label className="field">Payment type<select onChange={(event) => changePaymentType(event.target.value as PaymentType)} value={paymentType}><option value="rent">Rent / balance</option><option value="electricity">Electricity fee</option><option value="deposit">Deposit</option></select></label>
        <label className="field">Amount (KES)<input autoFocus min="1" onChange={(event) => setAmount(event.target.value)} placeholder="6,500" required type="number" value={amount} /></label>
        <label className="field">Payment method<select onChange={(event) => { setMethod(event.target.value as PaymentMethod); setError(""); }} value={method}><option value="mpesa">M-Pesa</option><option value="bank">KCB Bank</option><option value="cash">Cash</option></select></label>
        <label className="field">Date received<input max={todayInNairobi()} onChange={(event) => { setReceivedAt(event.target.value); setError(""); }} required type="date" value={receivedAt} /></label>
        <label className="field">Reference / code (optional)<input onChange={(event) => { setReference(event.target.value); setError(""); }} placeholder="M-Pesa code / bank ref" value={reference} /></label>
        <label className="field">Recorded by<input onChange={(event) => setRecordedBy(event.target.value)} required value={recordedBy} /></label>
        <label className="field field--wide">Note (optional)<textarea onChange={(event) => setNote(event.target.value)} placeholder="Part payment, correction note, or other detail" rows={3} value={note} /></label>
        {error && <p className="form-error field--wide" role="alert">{error}</p>}
        <footer className="modal-actions"><button className="button button--secondary" onClick={onClose} type="button">Cancel</button><button className="button button--primary" type="submit">Review payment</button></footer>
        </form>
      )}
    </Modal>
  );
}
