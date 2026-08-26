import { useState } from "react";
import { Icon } from "../../components/ui/Icon";
import { formatDate, formatKes } from "../../lib/format";
import type { WaterMeter, WaterMeterReading } from "../../types/domain";
import { MeterOdometer } from "./MeterOdometer";
import { WaterMeterDialog, type WaterMeterDraft } from "./WaterMeterDialog";
import { WaterMeterReadingDialog, type WaterMeterReadingDraft } from "./WaterMeterReadingDialog";
import { currentMeterPosition, readingsForMeter } from "./waterMeterCalculations";

interface WaterMetersSectionProps {
  canManage: boolean;
  canRegister: boolean;
  defaultRate?: number;
  meters: WaterMeter[];
  onMarkFullyPaid: (readingId: string) => void;
  onReadingAdded: (meterId: string, reading: WaterMeterReadingDraft) => void;
  onRegisterMeter: (meter: WaterMeterDraft) => void;
  onUpdateMeter: (meterId: string, meter: WaterMeterDraft) => void;
  readings: WaterMeterReading[];
}

function readingStatus(reading: WaterMeterReading) {
  if (reading.amountPaid >= reading.amountDue) return "paid";
  if (reading.amountPaid > 0) return "partial";
  return "unpaid";
}

export function WaterMetersSection({ canManage, canRegister, defaultRate, meters, onMarkFullyPaid, onReadingAdded, onRegisterMeter, onUpdateMeter, readings }: WaterMetersSectionProps) {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [editingMeterId, setEditingMeterId] = useState<string | null>(null);
  const [readingMeterId, setReadingMeterId] = useState<string | null>(null);
  const readingMeter = meters.find((meter) => meter.id === readingMeterId);
  const editingMeter = meters.find((meter) => meter.id === editingMeterId);
  const activeMeters = meters.filter((meter) => meter.status === "active").length;
  const outstanding = readings.reduce((total, reading) => total + Math.max(0, reading.amountDue - reading.amountPaid), 0);

  return (
    <section className="card water-meter-ledger">
      <header className="card-heading water-meter-ledger__header">
        <div><small className="card-title">Meter register</small><h2>Apartment water meters</h2><p>Physical-style readings, monthly usage, and customer bills for every registered meter.</p></div>
        <div className="water-meter-ledger__summary"><span><strong>{activeMeters}</strong> active {activeMeters === 1 ? "meter" : "meters"}</span><span><strong>{formatKes(outstanding)}</strong> outstanding</span>{canRegister && <button className="btn btn-primary btn-sm" onClick={() => setIsRegisterOpen(true)} type="button"><Icon name="plus" />Register Meter</button>}</div>
      </header>

      {!defaultRate && <aside className="info-box water-rate-notice"><span>Rate pending</span><p>You can register all meters now. Enter the confirmed rate when recording the first monthly reading, or save it under Water Settings.</p></aside>}

      <div className="room-cards water-meter-grid">
        {meters.map((meter) => {
          const meterReadings = readingsForMeter(readings, meter.id);
          const latest = meterReadings[0];
          const position = currentMeterPosition(meter, readings);
          const meterOutstanding = meterReadings.reduce((total, reading) => total + Math.max(0, reading.amountDue - reading.amountPaid), 0);
          const status = latest ? readingStatus(latest) : "new";
          return (
            <article className={`room-card water-meter-card ${status === "paid" ? "paid-room" : status === "partial" ? "partial-room" : status === "unpaid" ? "unpaid-room" : "vacant"}`} key={meter.id}>
              <header className="room-card-header"><div className="water-meter-identity"><span className="water-meter-icon">MTR</span><div><small>{meter.meterNumber}</small><h3 className="room-card-num">{meter.customerName}</h3></div></div><span className={`badge ${status === "paid" ? "badge-paid" : status === "partial" ? "badge-progress" : status === "unpaid" ? "badge-unpaid" : "badge-vacant"}`}>{latest ? status === "partial" ? "part paid" : status : "opening set"}</span></header>
              <div className="room-card-body water-meter-card__figures"><div className="rci water-meter-card__reading"><small className="rci-label">Current reading</small><MeterOdometer compact digitCount={meter.digitCount ?? 5} label={`${meter.customerName} current reading`} value={position.readingM3} /><span>{latest ? formatDate(latest.readingDate) : `Opened ${formatDate(meter.registeredAt)}`}</span></div><div className="rci"><small className="rci-label">Latest usage</small><strong className="rci-val">{latest ? `${latest.consumptionM3.toLocaleString("en-KE", { maximumFractionDigits: 1 })} m³` : "—"}</strong><span>{latest ? `${formatKes(latest.ratePerM3)} / m³` : "Awaiting next reading"}</span></div><div className="rci"><small className="rci-label">Latest bill</small><strong className="rci-val">{latest ? formatKes(latest.amountDue) : "—"}</strong><span>{formatKes(meterOutstanding)} total due</span></div></div>
              <div className="maint-card-meta water-meter-card__meta"><strong>{meterReadings.length} monthly {meterReadings.length === 1 ? "reading" : "readings"}</strong> · Opening position: {meter.openingReadingM3.toLocaleString("en-KE", { maximumFractionDigits: 1 })} m³</div>
              {(canManage || canRegister) && <div className="room-card-actions">{canRegister && <button className="btn btn-ghost btn-sm" onClick={() => setEditingMeterId(meter.id)} type="button">Meter Settings</button>}{canManage && <button className="btn btn-blue btn-sm" onClick={() => setReadingMeterId(meter.id)} type="button">Record Reading</button>}{canManage && latest && latest.amountPaid < latest.amountDue && <button className="btn btn-green btn-sm" onClick={() => onMarkFullyPaid(latest.id)} type="button">Mark Paid</button>}</div>}
              {meterReadings.length > 0 && <details className="water-meter-history"><summary>View reading history</summary><div>{meterReadings.map((reading) => <article className="pay-log" key={reading.id}><div className="pay-log-header"><span className="pay-log-date">{formatDate(reading.readingDate)}</span><strong className="pay-log-amount">{formatKes(reading.amountDue)}</strong></div><div className="pay-log-meta">{reading.previousReadingM3.toLocaleString("en-KE")} → {reading.currentReadingM3.toLocaleString("en-KE")} m³ · {reading.consumptionM3.toLocaleString("en-KE", { maximumFractionDigits: 1 })} m³ used · {formatKes(reading.ratePerM3)} / m³</div><div className="pay-log-code"><span className={`badge ${readingStatus(reading) === "paid" ? "badge-paid" : readingStatus(reading) === "partial" ? "badge-progress" : "badge-unpaid"}`}>{readingStatus(reading)}</span></div></article>)}</div></details>}
            </article>
          );
        })}
        {!meters.length && <div className="feature-empty water-meter-empty"><span><Icon name="water" size={26} /></span><div><strong>No meters registered yet</strong><p>Start with each meter’s number, customer, digit count, and current opening reading. All of Nyaga’s meters can be kept here.</p></div>{canRegister && <button className="btn btn-primary btn-sm" onClick={() => setIsRegisterOpen(true)} type="button">Register first meter</button>}</div>}
      </div>

      {isRegisterOpen && canRegister && <WaterMeterDialog existingMeterNumbers={meters.map((meter) => meter.meterNumber)} onClose={() => setIsRegisterOpen(false)} onSaved={(meter) => { onRegisterMeter(meter); setIsRegisterOpen(false); }} />}
      {editingMeter && canRegister && <WaterMeterDialog currentReadingM3={currentMeterPosition(editingMeter, readings).readingM3} existingMeterNumbers={meters.filter((meter) => meter.id !== editingMeter.id).map((meter) => meter.meterNumber)} hasReadings={readingsForMeter(readings, editingMeter.id).length > 0} meter={editingMeter} onClose={() => setEditingMeterId(null)} onSaved={(draft) => { onUpdateMeter(editingMeter.id, draft); setEditingMeterId(null); }} />}
      {readingMeter && canManage && <WaterMeterReadingDialog defaultRate={defaultRate} existingBillingMonths={readingsForMeter(readings, readingMeter.id).map((reading) => reading.billingMonth)} meter={readingMeter} onClose={() => setReadingMeterId(null)} onSaved={(reading) => { onReadingAdded(readingMeter.id, reading); setReadingMeterId(null); }} previousPosition={currentMeterPosition(readingMeter, readings)} />}
    </section>
  );
}
