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
  const month = new Intl.DateTimeFormat("en-KE", {month: "long", timeZone: "Africa/Nairobi", year: "numeric"}).format(new Date());
  const tone = collectionTone(rate);
  const ringRate = Math.min(100, Math.max(0, rate));
  const circumference = 2 * Math.PI * 30;
  const strokeDashoffset = circumference - ringRate / 100 * circumference;
  const toneColor = { complete: "var(--blue)", danger: "var(--red)", good: "var(--green)", warning: "var(--orange)" }[tone];

  return (
    <article className={`collect-card collection-card monthly-performance-card collection-card--${tone}`} id="dash-collect">
      <div className="ring-wrap" aria-label={`${rate}% monthly rent performance for ${month}`}>
        <svg aria-hidden="true" height="72" viewBox="0 0 72 72" width="72">
          <circle className="ring-bg" cx="36" cy="36" r="30" />
          <circle className={`ring-fill ring-fill--${tone}`} cx="36" cy="36" r="30" style={{ stroke: toneColor, strokeDasharray: circumference, strokeDashoffset }} />
        </svg>
        <div className="ring-pct" style={{ color: toneColor }}>{rate}%</div>
      </div>

      <div className="collect-info monthly-performance-card__main">
        <div className="collect-title">Monthly Performance</div>
        <div className="collect-main">{formatCurrency(collected)}</div>
        <div className="collect-sub">Confirmed rent received in {month}</div>
      </div>

      <dl className="monthly-performance-card__figures">
        <div><dt>Expected rent</dt><dd>{formatCurrency(expected)}</dd></div>
        <div><dt>Still to collect</dt><dd>{formatCurrency(pending)}</dd></div>
      </dl>

      <div className="monthly-performance-card__progress" aria-hidden="true">
        <span style={{background: toneColor, width: `${ringRate}%`}} />
      </div>
    </article>
  );
}
