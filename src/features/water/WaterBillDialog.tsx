import { useState, type FormEvent } from "react";
import { Modal } from "../../components/ui/Modal";
import { normalisedReference, isValidMonthInput, validateDate } from "../../lib/validation";
import type { WaterPurchaseBill } from "../../types/domain";

export type WaterBillDraft = Omit<WaterPurchaseBill, "id">;

interface WaterBillDialogProps {
  bill?: WaterPurchaseBill;
  defaultSupplier?: string;
  existingBills: WaterPurchaseBill[];
  onClose: () => void;
  onSaved: (bill: WaterBillDraft) => void;
}

function draftFromBill(bill: WaterPurchaseBill): WaterBillDraft {
  return { amount: bill.amount, dueDate: bill.dueDate, month: bill.month, note: bill.note, reference: bill.reference, status: bill.status, supplier: bill.supplier, volumeM3: bill.volumeM3 };
}

export function WaterBillDialog({ bill, defaultSupplier, existingBills, onClose, onSaved }: WaterBillDialogProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [draft, setDraft] = useState<WaterBillDraft>(bill ? draftFromBill(bill) : { amount: 0, dueDate: today, month: today.slice(0, 7), status: "unpaid", supplier: defaultSupplier ?? "" });
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const dateError = validateDate(draft.dueDate, "Due date");
    const reference = normalisedReference(draft.reference ?? "");
    const duplicate = reference && existingBills.some((item) => item.id !== bill?.id && normalisedReference(item.reference ?? "") === reference);
    if (!draft.supplier.trim()) {
      setError("Enter the water supplier.");
      return;
    }
    if (!isValidMonthInput(draft.month)) {
      setError("Enter a valid billing month.");
      return;
    }
    if (dateError) {
      setError(dateError);
      return;
    }
    if (!Number.isFinite(Number(draft.amount)) || Number(draft.amount) <= 0 || (draft.volumeM3 !== undefined && (!Number.isFinite(Number(draft.volumeM3)) || Number(draft.volumeM3) < 0))) {
      setError("Bill amount must be above zero and volume cannot be negative.");
      return;
    }
    if (duplicate) {
      setError("That invoice or reference is already used on another water bill.");
      return;
    }
    onSaved({ ...draft, amount: Number(draft.amount), note: draft.note?.trim() || undefined, reference: draft.reference?.trim() || undefined, supplier: draft.supplier.trim(), volumeM3: draft.volumeM3 ? Number(draft.volumeM3) : undefined });
  }

  return (
    <Modal description="Track a purchased-water bill, its consumption, due date, and payment status." onClose={onClose} title={bill ? "Edit water bill" : "Add water bill"}>
      <form className="modal-form" onSubmit={submit}>
        <label className="field">Supplier<input autoFocus onChange={(event) => setDraft({ ...draft, supplier: event.target.value })} placeholder="Water company or tanker supplier" required value={draft.supplier} /></label>
        <label className="field">Billing month<input onChange={(event) => setDraft({ ...draft, month: event.target.value })} required type="month" value={draft.month} /></label>
        <label className="field">Bill amount (KES)<input min="1" onChange={(event) => setDraft({ ...draft, amount: Number(event.target.value) })} required step="0.01" type="number" value={draft.amount || ""} /></label>
        <label className="field">Volume (m³, optional)<input min="0" onChange={(event) => setDraft({ ...draft, volumeM3: event.target.value ? Number(event.target.value) : undefined })} step="0.01" type="number" value={draft.volumeM3 ?? ""} /></label>
        <label className="field">Due date<input onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} required type="date" value={draft.dueDate} /></label>
        <label className="field">Payment status<select onChange={(event) => setDraft({ ...draft, status: event.target.value as WaterPurchaseBill["status"] })} value={draft.status}><option value="unpaid">Unpaid</option><option value="paid">Paid</option></select></label>
        <label className="field field--wide">Invoice / reference<input onChange={(event) => setDraft({ ...draft, reference: event.target.value })} placeholder="Optional" value={draft.reference ?? ""} /></label>
        <label className="field field--wide">Note<textarea onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="Account number, delivery details, or meter readings" rows={3} value={draft.note ?? ""} /></label>
        {error && <p className="form-error field--wide" role="alert">{error}</p>}
        <footer className="modal-actions"><button className="button button--secondary btn btn-ghost" onClick={onClose} type="button">Cancel</button><button className="button button--primary btn btn-primary" type="submit">Save bill</button></footer>
      </form>
    </Modal>
  );
}
