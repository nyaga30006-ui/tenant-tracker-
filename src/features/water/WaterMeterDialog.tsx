import { useState, type FormEvent } from "react";
import { Modal } from "../../components/ui/Modal";
import type { WaterMeter } from "../../types/domain";
import { validateDate } from "../../lib/validation";
import { clampMeterReading, MeterOdometer, MeterOdometerInput } from "./MeterOdometer";

export type WaterMeterDraft = Omit<WaterMeter, "id" | "status">;

interface WaterMeterDialogProps {
  currentReadingM3?: number;
  existingMeterNumbers: string[];
  hasReadings?: boolean;
  meter?: WaterMeter;
  onClose: () => void;
  onSaved: (meter: WaterMeterDraft) => void;
}

const digitCountOptions = [3, 4, 5, 6, 7, 8];

export function WaterMeterDialog({ currentReadingM3, existingMeterNumbers, hasReadings = false, meter, onClose, onSaved }: WaterMeterDialogProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [customerName, setCustomerName] = useState(meter?.customerName ?? "");
  const [meterNumber, setMeterNumber] = useState(meter?.meterNumber ?? "");
  const [digitCount, setDigitCount] = useState(meter?.digitCount ?? 5);
  const [openingReading, setOpeningReading] = useState(meter?.openingReadingM3 ?? 0);
  const [registeredAt, setRegisteredAt] = useState(meter?.registeredAt ?? today);
  const [error, setError] = useState("");
  const minimumDigitCount = Math.max(3, Math.min(8, String(Math.floor(currentReadingM3 ?? openingReading)).length));

  function changeDigitCount(nextDigitCount: number) {
    setDigitCount(nextDigitCount);
    if (!hasReadings) setOpeningReading((current) => clampMeterReading(current, nextDigitCount));
    setError("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalisedMeterNumber = meterNumber.trim();
    const dateError = validateDate(registeredAt, "Registration date", { max: today });
    if (dateError) {
      setError(dateError);
      return;
    }
    if (!customerName.trim() || !normalisedMeterNumber) {
      setError("Enter the apartment or customer and the meter number.");
      return;
    }
    if (existingMeterNumbers.some((number) => number.toLowerCase() === normalisedMeterNumber.toLowerCase())) {
      setError("That meter number is already registered.");
      return;
    }
    onSaved({
      customerName: customerName.trim(),
      digitCount,
      meterNumber: normalisedMeterNumber,
      openingReadingM3: openingReading,
      registeredAt,
    });
  }

  return (
    <Modal description={meter ? "Update the customer, meter identity, or number of digit wheels. Existing readings and bills stay unchanged." : "Register the customer and copy the physical meter's current position using the digit wheels."} onClose={onClose} title={meter ? "Meter settings" : "Register water meter"}>
      <form className="modal-form" onSubmit={submit}>
        <label className="field">Apartment / customer<input autoFocus onChange={(event) => setCustomerName(event.target.value)} placeholder="e.g. Greenview Apartments" required value={customerName} /></label>
        <label className="field">Meter number<input onChange={(event) => { setMeterNumber(event.target.value); setError(""); }} placeholder="e.g. NYG-WM-016" required value={meterNumber} /></label>
        <label className="field">Black whole-number digits<select aria-label="Number of black whole-number meter digits" onChange={(event) => changeDigitCount(Number(event.target.value))} value={digitCount}>{digitCountOptions.map((count) => <option disabled={count < minimumDigitCount} key={count} value={count}>{count} digits</option>)}</select><small className="field-hint">Choose the count shown on the physical meter. A red decimal wheel is added automatically.</small></label>
        <label className="field">Registration date<input max={today} onChange={(event) => { setRegisteredAt(event.target.value); setError(""); }} required type="date" value={registeredAt} /></label>
        {hasReadings ? (
          <div className="field field--wide info-box meter-odometer-control"><span className="meter-odometer-control__label">Current saved meter position</span><MeterOdometer digitCount={digitCount} label="Current saved meter position" value={currentReadingM3 ?? openingReading} /><small className="field-hint">The opening position is locked because monthly readings already exist. Changing the display digits does not change any reading or bill.</small></div>
        ) : (
          <MeterOdometerInput digitCount={digitCount} label="Opening meter reading" onChange={(value) => { setOpeningReading(value); setError(""); }} value={openingReading} />
        )}
        <p className="info-box field-hint field--wide">The opening reading is a starting point only. No customer charge is created until the next reading is recorded.</p>
        {error && <p className="form-error field--wide">{error}</p>}
        <footer className="modal-actions"><button className="button button--secondary btn btn-ghost" onClick={onClose} type="button">Cancel</button><button className="button button--primary btn btn-primary" type="submit">{meter ? "Save meter settings" : "Register meter"}</button></footer>
      </form>
    </Modal>
  );
}
