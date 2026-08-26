import { useState, type FormEvent } from "react";
import { Modal } from "../../components/ui/Modal";
import { formatKes } from "../../lib/format";
import type { Room } from "../../types/domain";
import { roomMonthlyCharge } from "./roomFinance";

export interface SetBookDraft {
  amountDue: number;
  note: string;
}

interface SetBookDialogProps {
  onClose: () => void;
  onSaved: (draft: SetBookDraft) => void;
  room: Room;
}

export function SetBookDialog({ onClose, onSaved, room }: SetBookDialogProps) {
  const currentBookBalance = room.bookBalanceDue !== undefined ? Math.max(0, room.bookBalanceDue - room.paid - room.credit) : undefined;
  const [amountDue, setAmountDue] = useState(currentBookBalance !== undefined ? String(currentBookBalance) : "");
  const [note, setNote] = useState(room.bookNote ?? "");
  const openingDue = Number(amountDue || 0);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isFinite(openingDue) || openingDue < 0) return;
    onSaved({ amountDue: openingDue, note: note.trim() });
  }

  return (
    <Modal description="Set the total amount this room owes when it starts using MyProperty." onClose={onClose} title={`Set the Book · ${room.number}`}>
      <form className="modal-form two-grid set-book-form" onSubmit={submit}>
        <section className="set-book-intro info-box field--wide">
          <strong>{room.tenant}</strong>
          <p>Enter the total balance due today. The monthly charge is already included in this number and will not be added again.</p>
        </section>
        <label className="field field--wide">Opening amount due (KES)<input autoFocus min="0" onChange={(event) => setAmountDue(event.target.value)} placeholder="e.g. 8,000" required type="number" value={amountDue} /></label>
        <label className="field field--wide">Opening note (optional)<textarea onChange={(event) => setNote(event.target.value)} placeholder="Reason, previous ledger date, or handover note" rows={3} value={note} /></label>
        <section aria-label="Opening balance preview" className="set-book-preview info-box two-grid field--wide">
          <div><small>Balance being set</small><strong>{formatKes(openingDue)}</strong></div>
          <div><small>Regular monthly charge</small><strong>{formatKes(roomMonthlyCharge(room))}</strong><span>Included—not added</span></div>
          <div><small>Paid this month</small><strong>{formatKes(room.paid)}</strong><span>Existing payments preserved</span></div>
          <div><small>Final balance due</small><strong>{formatKes(openingDue)}</strong></div>
        </section>
        <p className="form-note warning-box field--wide">This administrator-only adjustment replaces the current calculated balance. It does not create a fake payment or reset the room’s month.</p>
        <footer className="modal-actions"><button className="button button--secondary btn btn-ghost" onClick={onClose} type="button">Cancel</button><button className="button button--primary btn btn-primary" type="submit">Save Opening Book</button></footer>
      </form>
    </Modal>
  );
}
