import {Icon} from "../../../components/ui/Icon";
import {formatKes} from "../../../lib/format";
import {useAppData} from "../../../store/AppDataProvider";
import type {BillingResetRecord} from "../../../types/domain";
import {useLifetimeCollectionMetrics} from "../useLifetimeCollectionMetrics";

export interface DebtTrendPoint {
  amount: number;
  id: string;
  label: string;
}

export type DebtTrendDirection = "falling" | "flat" | "rising";

function shortDate(value: string): string {
  const dateOnly = value.slice(0, 10);
  const parsed = new Date(`${dateOnly}T12:00:00+03:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("en-KE", {day: "numeric", month: "short", timeZone: "Africa/Nairobi"}).format(parsed);
}

export function buildDebtTrend(history: BillingResetRecord[], currentDebt: number, now = new Date()) {
  const historicalPoints: DebtTrendPoint[] = [...history]
    .sort((left, right) => left.resetAt.localeCompare(right.resetAt))
    .slice(-5)
    .map((record) => ({amount: Math.max(0, record.arrearsCarried), id: record.id, label: shortDate(record.resetAt)}));
  const points = [...historicalPoints, {amount: Math.max(0, currentDebt), id: "current", label: "Today"}];
  const previousDebt = historicalPoints.at(-1)?.amount;
  const change = previousDebt === undefined ? 0 : currentDebt - previousDebt;
  const direction: DebtTrendDirection = previousDebt === undefined || change === 0 ? "flat" : change > 0 ? "rising" : "falling";
  const latestLabel = new Intl.DateTimeFormat("en-KE", {day: "numeric", month: "short", timeZone: "Africa/Nairobi", year: "numeric"}).format(now);
  return {change, direction, latestLabel, points, previousDebt};
}

function chartGeometry(points: DebtTrendPoint[]) {
  const width = 560;
  const height = 170;
  const horizontalPadding = 22;
  const topPadding = 18;
  const bottomPadding = 20;
  const maximum = Math.max(1, ...points.map((point) => point.amount));
  const plotted = points.map((point, index) => ({
    ...point,
    x: points.length === 1 ? width / 2 : horizontalPadding + index * (width - horizontalPadding * 2) / (points.length - 1),
    y: topPadding + (maximum - point.amount) / maximum * (height - topPadding - bottomPadding),
  }));
  const line = plotted.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ");
  const area = plotted.length > 1 ? `${line} L${plotted.at(-1)?.x},${height - bottomPadding} L${plotted[0].x},${height - bottomPadding} Z` : "";
  return {area, height, line, plotted, width};
}

export function DebtTrend() {
  const {billingResetHistory} = useAppData();
  const {dueAndArrears} = useLifetimeCollectionMetrics();
  const trend = buildDebtTrend(billingResetHistory, dueAndArrears);
  const chart = chartGeometry(trend.points);
  const trendIcon = trend.direction === "rising" ? "trendUp" : trend.direction === "falling" ? "trendDown" : "chart";
  const trendText = trend.direction === "rising" ? "Debt is rising" : trend.direction === "falling" ? "Debt is falling" : "Starting trend";

  return (
    <article className={`card debt-trend-card debt-trend-card--${trend.direction}`}>
      <header className="debt-trend-card__header">
        <div className="debt-trend-card__title">
          <span><Icon name="chart" size={18} /></span>
          <div><small>Debt trend</small><h2>Total rent debt</h2></div>
        </div>
        <div className={`debt-trend-card__signal debt-trend-card__signal--${trend.direction}`}>
          <Icon name={trendIcon} size={16} />
          <span>{trendText}</span>
          {trend.previousDebt !== undefined && <strong>{trend.change > 0 ? "+" : trend.change < 0 ? "−" : ""}{formatKes(Math.abs(trend.change))}</strong>}
        </div>
      </header>

      <div className="debt-trend-chart" role="img" aria-label={`${trendText}. Current rent debt is ${formatKes(dueAndArrears)}.`}>
        <svg aria-hidden="true" preserveAspectRatio="none" viewBox={`0 0 ${chart.width} ${chart.height}`}>
          <g className="debt-trend-chart__grid"><line x1="22" x2="538" y1="18" y2="18" /><line x1="22" x2="538" y1="75" y2="75" /><line x1="22" x2="538" y1="132" y2="132" /></g>
          {chart.area && <path className="debt-trend-chart__area" d={chart.area} />}
          <path className="debt-trend-chart__line" d={chart.line} />
          {chart.plotted.map((point) => <circle className="debt-trend-chart__point" cx={point.x} cy={point.y} key={point.id} r="5" />)}
        </svg>
        <div className="debt-trend-chart__labels" style={{gridTemplateColumns: `repeat(${trend.points.length}, minmax(0, 1fr))`}}>
          {trend.points.map((point) => <span key={point.id}>{point.label}</span>)}
        </div>
      </div>

      <footer className="debt-trend-card__summary">
        <div><span>Last reset</span><strong>{trend.previousDebt === undefined ? "No history" : formatKes(trend.previousDebt)}</strong></div>
        <div><span>Current debt</span><strong>{formatKes(dueAndArrears)}</strong></div>
        <div><span>Updated</span><strong>{trend.latestLabel}</strong></div>
      </footer>
      {billingResetHistory.length < 2 && <p className="debt-trend-card__note">This graph will build a clearer month-by-month pattern as each reset is completed.</p>}
    </article>
  );
}
