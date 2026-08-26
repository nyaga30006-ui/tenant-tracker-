import { useState, type FormEvent } from "react";
import { Modal } from "../../components/ui/Modal";
import { isValidMonthInput, validateDate } from "../../lib/validation";
import type { ElectricityBill } from "../../types/domain";

export type ElectricityBillDraft = Omit<ElectricityBill, "id">;

interface ElectricityBillDialogProps {
  bill?: ElectricityBill;
  onClose: () => void;
  onSaved: (bill: ElectricityBillDraft) => void;
}

export function ElectricityBillDialog({ bill, onClose, onSaved }: ElectricityBillDialogProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [draft, setDraft] = useState<ElectricityBillDraft>(bill ? { ...bill } : { area: "security", month: today.slice(0, 7), amount: 0, status: "unpaid", dueDate: today, note: "", recordedBy: "caretaker" });
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValidMonthInput(draft.month)) {
      setError("Enter a valid billing month.");
      return;
    }
    const dateError = validateDate(draft.dueDate, "Due date");
    if (dateError) {
      setError(dateError);
      return;
    }
    if (!Number.isFinite(Number(draft.amount)) || Number(draft.amount) <= 0 || !draft.recordedBy.trim()) {
      setError("Enter an amount above zero and the person recording this bill.");
      return;
    }
    onSaved({ ...draft, amount: Number(draft.amount), note: draft.note?.trim(), recordedBy: draft.recordedBy.trim() });
  }

  return (
    <Modal description="Record the shared-meter area, billing month, due date, payment status, and notes." onClose={onClose} title={bill ? "Edit electricity bill" : "Add electricity bill"}>
      <form className="modal-form" onSubmit={submit}>
        <label className="field">Meter area<select onChange={(event) => setDraft({ ...draft, area: event.target.value as ElectricityBill["area"] })} value={draft.area}><option value="security">Security</option><option value="apartment">Apartment</option><option value="borehole">Borehole</option></select></label>
        <label className="field">Billing month<input onChange={(event) => setDraft({ ...draft, month: event.target.value })} required type="month" value={draft.month} /></label>
        <label className="field">Amount (KES)<input autoFocus min="1" onChange={(event) => setDraft({ ...draft, amount: Number(event.target.value) })} required type="number" value={draft.amount || ""} /></label>
        <label className="field">Payment status<select onChange={(event) => setDraft({ ...draft, status: event.target.value as ElectricityBill["status"] })} value={draft.status}><option value="unpaid">Unpaid</option><option value="paid">Paid</option></select></label>
        <label className="field">Due date<input onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} required type="date" value={draft.dueDate} /></label>
        <label className="field">Recorded by<input onChange={(event) => setDraft({ ...draft, recordedBy: event.target.value })} required value={draft.recordedBy} /></label>
        <label className="field field--wide">Note<textarea onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="Meter details, usage, or account note" rows={3} value={draft.note ?? ""} /></label>
        {error && <p className="form-error field--wide" role="alert">{error}</p>}
        <footer className="modal-actions"><button className="button button--secondary btn btn-ghost" onClick={onClose} type="button">Cancel</button><button className="button button--primary btn btn-primary" type="submit">Save bill</button></footer>
      </form>
    </Modal>
  );
}
