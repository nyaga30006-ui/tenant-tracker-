import { useWater } from "../../hooks/useWater";
import { formatKes } from "../../lib/format";

export function WaterCollectionCard() {
  const { waterConfiguration, waterMeterReadings, waterMeters } = useWater();
  if (waterConfiguration?.mode !== "seller") return null;

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentMonthLabel = now.toLocaleDateString("en-KE", { month: "long", year: "numeric" });
  const currentReadings = waterMeterReadings.filter((reading) => reading.billingMonth === currentMonth);
  const billed = currentReadings.reduce((total, reading) => total + reading.amountDue, 0);
  const received = currentReadings.reduce((total, reading) => total + Math.min(reading.amountPaid, reading.amountDue), 0);
  const outstanding = Math.max(0, billed - received);
  const rate = billed ? Math.round(received / billed * 100) : 0;
  const ringCircumference = 2 * Math.PI * 30;
  const ringOffset = ringCircumference - (rate / 100) * ringCircumference;

  return (
    <article className="collect-card water-section-collection">
      <div className="ring-wrap" aria-label={`${rate}% of metered water bills paid`}>
        <svg aria-hidden="true" height="72" viewBox="0 0 72 72" width="72">
          <circle className="ring-bg" cx="36" cy="36" r="30" />
          <circle className="ring-fill water-payment-ring" cx="36" cy="36" r="30" style={{ stroke: "var(--teal)", strokeDasharray: ringCircumference, strokeDashoffset: ringOffset }} />
        </svg>
        <div className="ring-pct water-ring-pct">{rate}%</div>
      </div>
      <div className="collect-info">
        <div className="collect-title">Water Payment Rate · {currentMonthLabel}</div>
        <div className="collect-main">{rate}% Collected</div>
        <div className="collect-sub">{formatKes(received)} of {formatKes(billed)} billed · {currentReadings.length} meter reading{currentReadings.length === 1 ? "" : "s"}</div>
        <div className="collect-sub water-collection-outstanding">{formatKes(outstanding)} outstanding · {waterMeters.length} registered meter{waterMeters.length === 1 ? "" : "s"}</div>
        <div className="collect-sub">{waterConfiguration.serviceName}</div>
      </div>
    </article>
  );
}
