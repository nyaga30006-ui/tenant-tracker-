import { useState, type FormEvent } from "react";
import { useProperties, type NewProperty } from "../../hooks/useProperties";
import { Modal } from "../../components/ui/Modal";
import type { PaymentMethod, Property } from "../../types/domain";
import { MAX_PROPERTY_ROOMS, normaliseRoomCount } from "../rooms/roomFactory";

interface AddPropertyDialogProps {
  onAdded: (property: Property) => void;
  onClose: () => void;
}

const emptyProperty: NewProperty = { name: "", address: "", city: "", units: 1, monthlyRentTarget: 0, billingResetDay: 10, preferredPaymentMethod: "mpesa" };

export function AddPropertyDialog({ onAdded, onClose }: AddPropertyDialogProps) {
  const { addProperty } = useProperties();
  const [form, setForm] = useState<NewProperty>(emptyProperty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const property = await addProperty({
        ...form,
        name: form.name.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        units: normaliseRoomCount(form.units),
      });
      onAdded(property);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The property could not be created.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal description="Create a property, generate its vacant rooms, and make it the active workspace." onClose={onClose} title="Add a new property">
      <form className="modal-form two-grid" onSubmit={submit}>
        <label className="field field--wide">Property name<input autoFocus onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Greenview Apartments" required value={form.name} /></label>
        <label className="field field--wide">Street or area<input onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="e.g. Ngong Road" required value={form.address} /></label>
        <label className="field">Town / city<input onChange={(event) => setForm({ ...form, city: event.target.value })} placeholder="Nairobi" required value={form.city} /></label>
        <label className="field">Number of rooms<input max={MAX_PROPERTY_ROOMS} min="1" onChange={(event) => setForm({ ...form, units: Number(event.target.value) })} required type="number" value={form.units} /><small className="field-help info-box">Creates Room 01 through Room {String(normaliseRoomCount(form.units)).padStart(Math.max(2, String(normaliseRoomCount(form.units)).length), "0")} as editable vacant rooms.</small></label>
        <label className="field field--wide">Monthly rent target (Ksh)<input min="0" onChange={(event) => setForm({ ...form, monthlyRentTarget: Number(event.target.value) })} placeholder="0" type="number" value={form.monthlyRentTarget || ""} /></label>
        <label className="field field--wide">Primary payment method<select onChange={(event) => setForm({ ...form, preferredPaymentMethod: event.target.value as PaymentMethod })} value={form.preferredPaymentMethod}><option value="mpesa">M-Pesa</option><option value="bank">KCB Bank</option><option value="cash">Cash</option></select><small className="field-help">This method will be selected first when recording payments for this property.</small></label>
        <label className="field field--wide">Monthly billing reset day<input aria-describedby="billing-reset-help" max="28" min="1" onChange={(event) => setForm({ ...form, billingResetDay: Number(event.target.value) })} required type="number" value={form.billingResetDay} /><small className="field-help" id="billing-reset-help">Choose a day from 1 to 28 so it exists in every month.</small></label>
        {error && <div className="form-error warning-box field--wide" role="alert">{error}</div>}
        <footer className="modal-actions"><button className="button button--secondary btn btn-ghost" onClick={onClose} type="button">Cancel</button><button className="button button--primary btn btn-primary" disabled={saving} type="submit">{saving ? "Creating property…" : "Add property"}</button></footer>
      </form>
    </Modal>
  );
}
