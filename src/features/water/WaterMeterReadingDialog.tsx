import { useMemo, useState, type FormEvent } from "react";
import { Modal } from "../../components/ui/Modal";
import { formatKes } from "../../lib/format";
import type { WaterMeter, WaterMeterReading } from "../../types/domain";
import { MeterOdometer, MeterOdometerInput } from "./MeterOdometer";
import { calculateMeterCharge, validateWaterMeterReading, type WaterMeterPosition } from "./waterMeterCalculations";

export type WaterMeterReadingDraft = Omit<WaterMeterReading, "id" | "meterId">;

interface WaterMeterReadingDialogProps {
  defaultRate?: number;
  existingBillingMonths: string[];
  meter: WaterMeter;
  onClose: () => void;
  onSaved: (reading: WaterMeterReadingDraft) => void;
  previousPosition: WaterMeterPosition;
}

export function WaterMeterReadingDialog({ defaultRate, existingBillingMonths, meter, onClose, onSaved, previousPosition }: WaterMeterReadingDialogProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [readingDate, setReadingDate] = useState(today);
  const [currentReading, setCurrentReading] = useState(previousPosition.readingM3);
  const [rate, setRate] = useState(defaultRate?.toString() ?? "");
  const [error, setError] = useState("");
  const calculation = useMemo(() => calculateMeterCharge(previousPosition.readingM3, currentReading, Number(rate || 0)), [currentReading, previousPosition.readingM3, rate]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ratePerM3 = Number(rate);
    const billingMonth = readingDate.slice(0, 7);
    const validationError = validateWaterMeterReading({ currentReadingM3: currentReading, existingBillingMonths, previousPosition, ratePerM3, readingDate, today });
    if (validationError) {
      setError(validationError);
      return;
    }
    const result = calculateMeterCharge(previousPosition.readingM3, currentReading, ratePerM3);
    onSaved({
      ...result,
      amountPaid: 0,
      billingMonth,
      currentReadingM3: currentReading,
      previousReadingM3: previousPosition.readingM3,
      ratePerM3,
      readingDate,
    });
  }

  return (
    <Modal description={`Turn the wheels to match the latest reading for ${meter.customerName}. Consumption and the amount due are calculated automatically.`} onClose={onClose} title="Record monthly meter reading">
      <form className="modal-form" onSubmit={submit}>
        <div className="info-box meter-reading-baseline field--wide"><div><small>Meter</small><strong>{meter.meterNumber}</strong></div><div><small>Previous reading</small><MeterOdometer compact digitCount={meter.digitCount ?? 5} label="Previous reading" value={previousPosition.readingM3} /></div></div>
        <label className="field field--wide">Reading date<input max={today} min={previousPosition.readingDate} onChange={(event) => { setReadingDate(event.target.value); setError(""); }} required type="date" value={readingDate} /></label>
        <MeterOdometerInput digitCount={meter.digitCount ?? 5} label="Current meter reading" onChange={(value) => { setCurrentReading(value); setError(""); }} value={currentReading} />
        <label className="field field--wide">Current rate per m³ (KES)<input min="0.01" onChange={(event) => { setRate(event.target.value); setError(""); }} placeholder="Enter rate once confirmed" required step="0.01" type="number" value={rate} /><small className="field-hint">This rate is saved with this month so older bills remain accurate if the rate changes later.</small></label>
        <section aria-live="polite" className="info-box meter-calculation-preview field--wide"><div><small>Consumption</small><strong>{calculation.consumptionM3.toLocaleString("en-KE", { maximumFractionDigits: 1 })} m³</strong></div><span>×</span><div><small>Rate</small><strong>{formatKes(Number(rate || 0))}</strong></div><span>=</span><div><small>Amount due</small><strong>{formatKes(calculation.amountDue)}</strong></div></section>
        {error && <p className="form-error field--wide">{error}</p>}
        <footer className="modal-actions"><button className="button button--secondary btn btn-ghost" onClick={onClose} type="button">Cancel</button><button className="button button--primary btn btn-primary" type="submit">Save reading &amp; bill</button></footer>
      </form>
    </Modal>
  );
}
