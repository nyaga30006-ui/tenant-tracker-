import { useState, type FormEvent } from "react";
import { Modal } from "../../components/ui/Modal";
import type { WaterSale, WaterSaleChannel } from "../../types/domain";

export type WaterSaleDraft = Omit<WaterSale, "id">;

interface WaterSaleDialogProps {
  defaultRate?: number;
  onClose: () => void;
  onSaved: (sale: WaterSaleDraft) => void;
  sale?: WaterSale;
}

function draftFromSale(sale: WaterSale): WaterSaleDraft {
  return { amountDue: sale.amountDue, amountPaid: sale.amountPaid, channel: sale.channel, customerName: sale.customerName, note: sale.note, ratePerM3: sale.ratePerM3, reference: sale.reference, saleDate: sale.saleDate, volumeM3: sale.volumeM3 };
}

export function WaterSaleDialog({ defaultRate, onClose, onSaved, sale }: WaterSaleDialogProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [draft, setDraft] = useState<WaterSaleDraft>(sale ? draftFromSale(sale) : { amountDue: 0, amountPaid: 0, channel: "apartment", customerName: "", ratePerM3: defaultRate, saleDate: today, volumeM3: 0 });

  function updateVolume(volumeM3: number) {
    setDraft((current) => ({ ...current, volumeM3, amountDue: current.ratePerM3 ? Number((volumeM3 * current.ratePerM3).toFixed(2)) : current.amountDue }));
  }

  function updateRate(ratePerM3: number | undefined) {
    setDraft((current) => ({ ...current, ratePerM3, amountDue: ratePerM3 ? Number((current.volumeM3 * ratePerM3).toFixed(2)) : current.amountDue }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSaved({ ...draft, amountDue: Number(draft.amountDue), amountPaid: Number(draft.amountPaid), customerName: draft.customerName.trim(), note: draft.note?.trim() || undefined, ratePerM3: draft.ratePerM3 ? Number(draft.ratePerM3) : undefined, reference: draft.reference?.trim() || undefined, volumeM3: Number(draft.volumeM3) });
  }

  return (
    <Modal description="Record an apartment delivery or tanker sale. The total can be calculated from volume and rate, or entered manually." onClose={onClose} title={sale ? "Edit water sale" : "Record water sale"}>
      <form className="modal-form" onSubmit={submit}>
        <label className="field">Customer / apartment<input autoFocus onChange={(event) => setDraft({ ...draft, customerName: event.target.value })} placeholder="e.g. Greenview Apartments" required value={draft.customerName} /></label>
        <label className="field">Sale channel<select onChange={(event) => setDraft({ ...draft, channel: event.target.value as WaterSaleChannel })} value={draft.channel}><option value="apartment">Apartment supply</option><option value="tanker">Tanker service</option></select></label>
        <label className="field">Delivery date<input onChange={(event) => setDraft({ ...draft, saleDate: event.target.value })} required type="date" value={draft.saleDate} /></label>
        <label className="field">Volume (m³)<input min="0.01" onChange={(event) => updateVolume(Number(event.target.value))} required step="0.01" type="number" value={draft.volumeM3 || ""} /></label>
        <label className="field">Rate per m³ (optional)<input min="0" onChange={(event) => updateRate(event.target.value ? Number(event.target.value) : undefined)} placeholder="Unknown / varies" step="0.01" type="number" value={draft.ratePerM3 ?? ""} /></label>
        <label className="field">Total billed (KES)<input min="1" onChange={(event) => setDraft({ ...draft, amountDue: Number(event.target.value) })} required step="0.01" type="number" value={draft.amountDue || ""} /></label>
        <label className="field">Amount received (KES)<input min="0" onChange={(event) => setDraft({ ...draft, amountPaid: Number(event.target.value) })} step="0.01" type="number" value={draft.amountPaid || ""} /></label>
        <label className="field">Receipt / reference<input onChange={(event) => setDraft({ ...draft, reference: event.target.value })} placeholder="Optional" value={draft.reference ?? ""} /></label>
        <label className="field field--wide">Note<textarea onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="Meter reading, delivery details, or follow-up note" rows={3} value={draft.note ?? ""} /></label>
        <footer className="modal-actions"><button className="button button--secondary btn btn-ghost" onClick={onClose} type="button">Cancel</button><button className="button button--primary btn btn-primary" type="submit">Save sale</button></footer>
      </form>
    </Modal>
  );
}
