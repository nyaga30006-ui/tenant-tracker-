import { useAppNavigation } from "../../../app/NavigationContext";
import { Icon } from "../../../components/ui/Icon";
import { useProperties } from "../../../hooks/useProperties";
import { formatBillingResetDay, nextBillingResetDate } from "../../../lib/billingSchedule";
import { formatDate, formatKes } from "../../../lib/format";
import { useAppData } from "../../../store/AppDataProvider";

export function OperationalOverview() {
  const { navigate } = useAppNavigation();
  const { selectedProperty } = useProperties();
  const { billingResetHistory, electricityBills, maintenanceIssues } = useAppData();
  const latestBillMonth = electricityBills.map((bill) => bill.month).sort().at(-1);
  const currentBills = electricityBills.filter((bill) => bill.month === latestBillMonth);
  const openIssues = maintenanceIssues.filter((issue) => issue.status !== "completed");
  const resetHistory = [...billingResetHistory].sort((a, b) => b.resetAt.localeCompare(a.resetAt)).slice(0, 4);

  return (
    <section className="dashboard-operations">
      <div className="two-grid dashboard-operation-grid">
        <article className="card operation-card dashboard-electricity-card">
          <header className="card-heading"><div className="card-title">Electricity Summary</div><strong>{formatKes(currentBills.reduce((sum, bill) => sum + bill.amount, 0))}</strong></header>
          <div className="dashboard-utility-list">
            {currentBills.map((bill) => <div className="bar-row" key={bill.id}><span className="capitalize">{bill.area} <small className={`badge badge-${bill.status === "paid" ? "paid" : "unpaid"}`}>{bill.status}</small></span><strong>{formatKes(bill.amount)}</strong></div>)}
          </div>
          {!currentBills.length && <p className="operation-empty">No electricity bills recorded.</p>}
          <footer className="card-footer"><button className="btn btn-ghost btn-sm" onClick={() => navigate("electricity")} type="button">View Electricity <Icon name="arrow" size={14} /></button></footer>
        </article>

        <article className="card operation-card dashboard-maintenance-card">
          <header className="card-heading"><div className="card-title">Open Issues</div><strong>{openIssues.length}</strong></header>
          <div className="dashboard-issue-list">
            {openIssues.map((issue) => <div className="recent-pay-row" key={issue.id}><span className="issue-icon"><Icon name="tools" size={17} /></span><div className="rpr-info"><div className="rpr-main">{issue.title}</div><div className="rpr-meta">{issue.roomNumber ?? issue.area ?? "Shared area"} · {issue.assignedTo}</div></div><b>{formatKes(issue.amount)}</b></div>)}
          </div>
          {!openIssues.length && <p className="operation-empty">No open maintenance records.</p>}
          <footer className="card-footer"><button className="btn btn-ghost btn-sm" onClick={() => navigate("maintenance")} type="button">View All <Icon name="arrow" size={14} /></button></footer>
        </article>
      </div>

      <article className="card operation-card operation-card--wide billing-history-card">
        <header className="card-heading"><div className="card-title">Monthly Reset History</div><strong>{formatBillingResetDay(selectedProperty.billingResetDay)}</strong></header>
        <div className="hist-scroll">
          <table className="hist-table">
            <thead><tr><th>Date</th><th>Reset</th><th>Rooms</th><th>Arrears</th><th>Status</th></tr></thead>
            <tbody>
              {resetHistory.map((record) => <tr key={record.id}><td>{formatDate(record.resetAt)}</td><td>{record.kind === "manual" ? "Manual" : "Automatic"}</td><td>{record.roomsProcessed}</td><td>{formatKes(record.arrearsCarried)}</td><td><span className="badge badge-resolved">Completed</span></td></tr>)}
              {!resetHistory.length && <tr><td colSpan={5}>No local billing resets have been completed yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <footer className="card-footer">Next scheduled reset: <strong>{formatDate(nextBillingResetDate(selectedProperty.billingResetDay).toISOString())}</strong></footer>
      </article>
    </section>
  );
}
