import { useAppMetrics } from "../../../app/useAppMetrics";
import { formatCurrency } from "../../../lib/format";

export type CollectionTone = "danger" | "warning" | "good" | "complete";

export function collectionTone(rate: number): CollectionTone {
  if (rate >= 100) return "complete";
  if (rate >= 70) return "good";
  if (rate >= 20) return "warning";
  return "danger";
}

export function PremiumCollection() {
  const { collected, expected, pending, rate } = useAppMetrics();
  const month = new Intl.DateTimeFormat("en-KE", { month: "long" }).format(new Date());
  const tone = collectionTone(rate);
  const ringRate = Math.min(100, Math.max(0, rate));
  const circumference = 2 * Math.PI * 30;
  const strokeDashoffset = circumference - ringRate / 100 * circumference;
  const toneColor = { complete: "var(--blue)", danger: "var(--red)", good: "var(--green)", warning: "var(--orange)" }[tone];

  return (
    <article className={`collect-card collection-card collection-card--${tone}`} id="dash-collect">
      <div className="ring-wrap" aria-label={`${rate}% of ${month} rent collected`}>
        <svg aria-hidden="true" height="72" viewBox="0 0 72 72" width="72">
          <circle className="ring-bg" cx="36" cy="36" r="30" />
          <circle className={`ring-fill ring-fill--${tone}`} cx="36" cy="36" r="30" style={{ stroke: toneColor, strokeDasharray: circumference, strokeDashoffset }} />
        </svg>
        <div className="ring-pct" style={{ color: toneColor }}>{rate}%</div>
      </div>

      <div className="collect-info">
        <div className="collect-title">Collection Rate</div>
        <div className="collect-main" style={{ color: toneColor }}>{rate}% Collected</div>
        <div className="collect-sub">{formatCurrency(collected)} of {formatCurrency(expected)} due in {month}</div>
        <div className="collect-sub collect-sub--outstanding">{formatCurrency(pending)} outstanding</div>
      </div>
    </article>
  );
}
