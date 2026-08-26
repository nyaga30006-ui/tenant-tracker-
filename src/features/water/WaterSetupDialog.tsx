import { useState, type FormEvent } from "react";
import { Modal } from "../../components/ui/Modal";
import type { WaterConfiguration, WaterMode } from "../../types/domain";

interface WaterSetupDialogProps {
  configuration?: WaterConfiguration | null;
  onClose: () => void;
  onSaved: (configuration: WaterConfiguration) => void;
  propertyName: string;
}

export function WaterSetupDialog({ configuration, onClose, onSaved, propertyName }: WaterSetupDialogProps) {
  const [mode, setMode] = useState<WaterMode>(configuration?.mode ?? "seller");
  const [serviceName, setServiceName] = useState(configuration?.serviceName ?? "");
  const [defaultRate, setDefaultRate] = useState(configuration?.defaultRatePerM3?.toString() ?? "");
  const [defaultSupplier, setDefaultSupplier] = useState(configuration?.defaultSupplier ?? "");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericRate = Number(defaultRate);
    onSaved({
      configuredAt: configuration?.configuredAt ?? new Date().toISOString(),
      defaultRatePerM3: mode === "seller" && numericRate > 0 ? numericRate : undefined,
      defaultSupplier: mode === "buyer" ? defaultSupplier.trim() || undefined : undefined,
      mode,
      serviceName: serviceName.trim() || (mode === "seller" ? `${propertyName} Water Service` : `${propertyName} Water Account`),
    });
  }

  return (
    <Modal description={`Choose how water works at ${propertyName}. You can change this later without losing records.`} onClose={onClose} title={configuration ? "Water feature settings" : "Add water feature"}>
      <form className="modal-form water-setup-form" onSubmit={submit}>
        <div className="pay-method-row water-scenario-grid field--wide" role="group" aria-label="Water business scenario">
          <button aria-pressed={mode === "seller"} className={mode === "seller" ? "pay-method-btn water-scenario selected is-selected" : "pay-method-btn water-scenario"} onClick={() => setMode("seller")} type="button">
            <span>01</span><strong>Sell metered water</strong><small>Register apartment meters, record monthly readings, and calculate usage, bills, collections, and balances.</small>
          </button>
          <button aria-pressed={mode === "buyer"} className={mode === "buyer" ? "pay-method-btn water-scenario selected is-selected" : "pay-method-btn water-scenario"} onClick={() => setMode("buyer")} type="button">
            <span>02</span><strong>Buy water</strong><small>Track supplier bills, consumption, due dates, and payment status for this apartment.</small>
          </button>
        </div>

        <label className="field field--wide">{mode === "seller" ? "Water service name" : "Water account name"}<input autoFocus onChange={(event) => setServiceName(event.target.value)} placeholder={mode === "seller" ? `${propertyName} Metered Water` : `${propertyName} Water Bills`} value={serviceName} /></label>
        {mode === "seller" ? (
          <label className="field field--wide">Default rate per m³ (optional)<input min="0" onChange={(event) => setDefaultRate(event.target.value)} placeholder="Leave blank until the rate is confirmed" step="0.01" type="number" value={defaultRate} /><small className="field-hint">This rate calculates each meter's monthly bill. Every saved reading keeps the rate used that month.</small></label>
        ) : (
          <label className="field field--wide">Usual supplier (optional)<input onChange={(event) => setDefaultSupplier(event.target.value)} placeholder="e.g. Nairobi Water or private tanker" value={defaultSupplier} /></label>
        )}

        <footer className="modal-actions"><button className="button button--secondary btn btn-ghost" onClick={onClose} type="button">Cancel</button><button className="button button--primary btn btn-primary" type="submit">{configuration ? "Save settings" : "Add water feature"}</button></footer>
      </form>
    </Modal>
  );
}
