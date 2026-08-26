import { useState, type FormEvent } from "react";
import { Modal } from "../../components/ui/Modal";
import { formatKes } from "../../lib/format";
import { validateDate } from "../../lib/validation";
import type { Room, TenantResidency } from "../../types/domain";
import { roomRecurringBalance } from "./roomFinance";

export interface MoveOutTenantDraft {
  deductionNote: string;
  depositAppliedToBalance: number;
  depositDeducted: number;
  depositRefunded: number;
  finalBalance: number;
  moveOutDate: string;
  moveOutNote: string;
}

interface MoveOutTenantDialogProps {
  onClose: () => void;
  onSaved: (draft: MoveOutTenantDraft) => void;
  residency?: TenantResidency;
  room: Room;
}

function todayInNairobi() {
  return new Intl.DateTimeFormat("en-CA", { day: "2-digit", month: "2-digit", timeZone: "Africa/Nairobi", year: "numeric" }).format(new Date());
}

export function MoveOutTenantDialog({ onClose, onSaved, residency, room }: MoveOutTenantDialogProps) {
  const depositHeld = room.depositPaid ?? residency?.depositHeld ?? 0;
  const accountBalance = roomRecurringBalance(room);
  const maximumBalanceApplication = Math.min(depositHeld, Math.max(0, accountBalance));
  const [moveOutDate, setMoveOutDate] = useState(todayInNairobi());
  const [depositAppliedToBalance, setDepositAppliedToBalance] = useState("");
  const [otherDeduction, setOtherDeduction] = useState("");
  const [deductionNote, setDeductionNote] = useState("");
  const [moveOutNote, setMoveOutNote] = useState("");
  const [error, setError] = useState("");
  const applied = Number(depositAppliedToBalance || 0);
  const other = Number(otherDeduction || 0);
  const totalDeducted = applied + other;
  const depositRefunded = Math.max(0, depositHeld - totalDeducted);
  const finalBalance = accountBalance - applied;
  const invalidDeduction = applied < 0 || other < 0 || applied > maximumBalanceApplication || totalDeducted > depositHeld;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const dateError = validateDate(moveOutDate, "Move-out date", { min: residency?.moveInDate, max: todayInNairobi() });
    if (dateError) {
      setError(dateError);
      return;
    }
    if (invalidDeduction || (totalDeducted > 0 && !deductionNote.trim())) {
      setError("Check the deposit deductions and explain any amount withheld.");
      return;
    }
    onSaved({
      deductionNote: deductionNote.trim(),
      depositAppliedToBalance: applied,
      depositDeducted: totalDeducted,
      depositRefunded,
      finalBalance,
      moveOutDate,
      moveOutNote: moveOutNote.trim(),
    });
  }

  return (
    <Modal description={`Close ${room.tenant}’s occupancy, settle the deposit, archive the balance, and return ${room.number} to vacant.`} onClose={onClose} title="Move tenant out">
      <form className="modal-form two-grid" onSubmit={submit}>
        <section className="move-out-account info-box two-grid field--wide">
          <div><small>Tenant</small><strong>{room.tenant}</strong><span>{residency?.moveInDate ? `Moved in ${residency.moveInDate}` : "Current occupancy"}</span></div>
          <div><small>Rent account</small><strong className={accountBalance > 0 ? "balance-text--arrears" : accountBalance < 0 ? "balance-text--credit" : "balance-text--cleared"}>{accountBalance > 0 ? `${formatKes(accountBalance)} due` : accountBalance < 0 ? `${formatKes(accountBalance)} credit` : "Cleared"}</strong></div>
          <div><small>Deposit held</small><strong>{formatKes(depositHeld)}</strong></div>
        </section>
        <label className="field">Move-out date<input max={todayInNairobi()} min={residency?.moveInDate} onChange={(event) => { setMoveOutDate(event.target.value); setError(""); }} required type="date" value={moveOutDate} /></label>
        <label className="field">Deposit used for rent balance<input inputMode="numeric" max={maximumBalanceApplication} min="0" onChange={(event) => setDepositAppliedToBalance(event.target.value)} placeholder="0" type="number" value={depositAppliedToBalance} /><small className="field-help">Maximum available for the current rent balance: {formatKes(maximumBalanceApplication)}.</small></label>
        <label className="field field--wide">Other deposit deductions<input inputMode="numeric" max={Math.max(0, depositHeld - applied)} min="0" onChange={(event) => setOtherDeduction(event.target.value)} placeholder="Damages, cleaning or lost keys" type="number" value={otherDeduction} /></label>
        {totalDeducted > 0 && <label className="field field--wide">Deduction explanation<textarea autoFocus onChange={(event) => setDeductionNote(event.target.value)} placeholder="Explain every deduction from the tenant’s deposit" required rows={3} value={deductionNote} /></label>}
        <section className="deposit-settlement info-box field--wide" aria-live="polite">
          <div><small>Deposit held</small><strong>{formatKes(depositHeld)}</strong></div><b>−</b>
          <div><small>Total deductions</small><strong>{formatKes(totalDeducted)}</strong></div><b>=</b>
          <div><small>Refund to tenant</small><strong>{formatKes(depositRefunded)}</strong></div>
          <p>Final rent position: <strong className={finalBalance > 0 ? "balance-text--arrears" : finalBalance < 0 ? "balance-text--credit" : "balance-text--cleared"}>{finalBalance > 0 ? `${formatKes(finalBalance)} still due` : finalBalance < 0 ? `${formatKes(finalBalance)} credit` : "Cleared"}</strong></p>
        </section>
        {invalidDeduction && <p className="form-error warning-box field--wide">The deductions cannot exceed the deposit held, and the rent allocation cannot exceed the outstanding rent balance.</p>}
        {error && <p className="form-error warning-box field--wide" role="alert">{error}</p>}
        <label className="field field--wide">Move-out note (optional)<textarea onChange={(event) => setMoveOutNote(event.target.value)} placeholder="Inspection result, keys returned, forwarding details, or follow-up required" rows={3} value={moveOutNote} /></label>
        <p className="residency-warning warning-box field--wide">After confirmation, old payments will be marked as former residency and the room will be cleared for the next tenant. The history will not be deleted.</p>
        <footer className="modal-actions"><button className="button button--secondary btn btn-ghost" onClick={onClose} type="button">Cancel</button><button className="button button--danger btn btn-danger" disabled={invalidDeduction} type="submit">Confirm move-out</button></footer>
      </form>
    </Modal>
  );
}
