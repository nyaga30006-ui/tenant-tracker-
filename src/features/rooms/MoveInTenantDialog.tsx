import { useState, type FormEvent } from "react";
import { Modal } from "../../components/ui/Modal";
import { formatKes } from "../../lib/format";
import { validateDate } from "../../lib/validation";
import type { Room } from "../../types/domain";

export interface MoveInTenantDraft {
  depositHeld: number;
  depositRequired: number;
  electricityDueEnabled: boolean;
  moveInDate: string;
  moveInNote: string;
  rent: number;
  tenantName: string;
  tenantPhone: string;
}

interface MoveInTenantDialogProps {
  canSetFinancialTerms?: boolean;
  onClose: () => void;
  onSaved: (draft: MoveInTenantDraft) => void;
  room: Room;
}

function todayInNairobi() {
  return new Intl.DateTimeFormat("en-CA", { day: "2-digit", month: "2-digit", timeZone: "Africa/Nairobi", year: "numeric" }).format(new Date());
}

export function MoveInTenantDialog({ canSetFinancialTerms = true, onClose, onSaved, room }: MoveInTenantDialogProps) {
  const [tenantName, setTenantName] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [moveInDate, setMoveInDate] = useState(todayInNairobi());
  const [rent, setRent] = useState(String(room.rent || ""));
  const [depositRequired, setDepositRequired] = useState(String(room.depositRequired ?? room.rent ?? ""));
  const [depositHeld, setDepositHeld] = useState("");
  const [electricityDueEnabled, setElectricityDueEnabled] = useState(room.electricityDueEnabled ?? false);
  const [moveInNote, setMoveInNote] = useState("");
  const [error, setError] = useState("");
  const numericRent = Number(rent);
  const numericDepositRequired = Number(depositRequired || 0);
  const numericDepositHeld = Number(depositHeld || 0);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const dateError = validateDate(moveInDate, "Move-in date", { max: todayInNairobi() });
    if (dateError) {
      setError(dateError);
      return;
    }
    if (!tenantName.trim()) {
      setError("Enter the tenant's name before moving them in.");
      return;
    }
    if (numericRent <= 0 || numericDepositRequired < 0 || numericDepositHeld < 0) {
      setError("Rent must be above zero and deposit amounts cannot be negative.");
      return;
    }
    onSaved({
      depositHeld: canSetFinancialTerms ? numericDepositHeld : 0,
      depositRequired: numericDepositRequired,
      electricityDueEnabled,
      moveInDate,
      moveInNote: moveInNote.trim(),
      rent: numericRent,
      tenantName: tenantName.trim(),
      tenantPhone: tenantPhone.trim(),
    });
  }

  return (
    <Modal description={`Create a new occupancy for ${room.number}. Previous tenants and payments will remain in the room history.`} onClose={onClose} title="Move tenant in">
      <form className="modal-form two-grid" onSubmit={submit}>
        <label className="field field--wide">Tenant name<input autoFocus onChange={(event) => { setTenantName(event.target.value); setError(""); }} placeholder="Full tenant name" required value={tenantName} /></label>
        <label className="field">Phone number (optional)<input inputMode="tel" onChange={(event) => setTenantPhone(event.target.value)} placeholder="07... or 254..." value={tenantPhone} /></label>
        <label className="field">Move-in date<input max={todayInNairobi()} onChange={(event) => { setMoveInDate(event.target.value); setError(""); }} required type="date" value={moveInDate} /></label>
        <label className="field">Monthly rent (KES)<input disabled={!canSetFinancialTerms} inputMode="numeric" min="1" onChange={(event) => setRent(event.target.value)} required type="number" value={rent} /></label>
        <label className="field">Deposit required (KES)<input disabled={!canSetFinancialTerms} inputMode="numeric" min="0" onChange={(event) => setDepositRequired(event.target.value)} required type="number" value={depositRequired} /></label>
        {canSetFinancialTerms ? <label className="field field--wide">Deposit already held (KES)<input inputMode="numeric" max={numericDepositRequired || undefined} min="0" onChange={(event) => setDepositHeld(event.target.value)} placeholder="0" type="number" value={depositHeld} /><small className="field-help">Use this only for money received before creating the occupancy. New deposit payments should be recorded normally.</small></label> : <p className="info-box field--wide">The room's existing rent and deposit terms will be used. Record any deposit received as a separate payment after moving the tenant in.</p>}
        <label className="choice-field info-box field--wide"><input checked={electricityDueEnabled} disabled={!canSetFinancialTerms} onChange={(event) => setElectricityDueEnabled(event.target.checked)} type="checkbox" /><span><strong>Charge the one-time electricity fee</strong><small>KES 2,500 will be due once for this tenancy and will not be added during monthly resets.</small></span></label>
        <section className="residency-preview info-box two-grid field--wide"><div><small>Room</small><strong>{room.number}</strong></div><div><small>Monthly rent</small><strong>{formatKes(numericRent || 0)}</strong></div><div><small>Deposit position</small><strong>{formatKes(numericDepositHeld)} held / {formatKes(numericDepositRequired)} required</strong></div></section>
        <label className="field field--wide">Move-in note (optional)<textarea onChange={(event) => setMoveInNote(event.target.value)} placeholder="Agreement reference, keys issued, or opening condition" rows={3} value={moveInNote} /></label>
        {error && <p className="form-error warning-box field--wide" role="alert">{error}</p>}
        <footer className="modal-actions"><button className="button button--secondary btn btn-ghost" onClick={onClose} type="button">Cancel</button><button className="button button--primary btn btn-primary" type="submit">Confirm move-in</button></footer>
      </form>
    </Modal>
  );
}
