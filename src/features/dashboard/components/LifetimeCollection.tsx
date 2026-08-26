import { formatCurrency } from "../../../lib/format";
import { useLifetimeCollectionMetrics } from "../useLifetimeCollectionMetrics";
import { collectionTone } from "./PremiumCollection";

export function LifetimeCollection() {
  const { collected, credits, depositAppliedToBalances, dueAndArrears, paymentCount, rate, totalCharged } = useLifetimeCollectionMetrics();
  const tone = collectionTone(rate);
  const ringRate = Math.min(100, Math.max(0, rate));
  const circumference = 2 * Math.PI * 30;
  const strokeDashoffset = circumference - ringRate / 100 * circumference;
  const toneColor = { complete: "var(--blue)", danger: "var(--red)", good: "var(--green)", warning: "var(--orange)" }[tone];

  return (
    <article className={`collect-card lifetime-collection-card lifetime-collection-card--${tone}`} id="dash-rent-performance">
      <div className="ring-wrap" aria-label={`${rate}% all-time collection rate`}>
        <svg aria-hidden="true" height="72" viewBox="0 0 72 72" width="72">
          <circle className="ring-bg" cx="36" cy="36" r="30" />
          <circle className={`ring-fill ring-fill--${tone}`} cx="36" cy="36" r="30" style={{ stroke: toneColor, strokeDasharray: circumference, strokeDashoffset }} />
        </svg>
        <div className="ring-pct" style={{ color: toneColor }}>{rate}%</div>
      </div>

      <div className="collect-info">
        <div className="collect-title">All-Time Collection Rate</div>
        <div className="collect-main" style={{ color: toneColor }}>{rate}% Performance</div>
        <div className="collect-sub">{formatCurrency(collected)} collected from {formatCurrency(totalCharged)} charged · {paymentCount} confirmed payment{paymentCount === 1 ? "" : "s"}</div>
        <div className="collect-sub">{formatCurrency(dueAndArrears)} due + arrears · {formatCurrency(credits)} active credits{depositAppliedToBalances > 0 ? ` · ${formatCurrency(depositAppliedToBalances)} deposit applied` : ""}</div>
      </div>
    </article>
  );
}
