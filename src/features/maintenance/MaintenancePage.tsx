import { useEffect, useMemo, useState } from "react";
import { useAppData } from "../../store/AppDataProvider";
import { Icon } from "../../components/ui/Icon";
import { formatDate, formatKes } from "../../lib/format";
import type { MaintenanceIssue, MaintenanceStatus } from "../../types/domain";
import { MaintenanceIssueDialog, type MaintenanceDraft } from "./MaintenanceIssueDialog";
import { useAccess } from "../../app/AccessContext";
import { useProperties } from "../../hooks/useProperties";

type CategoryFilter = "all" | NonNullable<MaintenanceIssue["category"]>;
type StatusFilter = "all" | MaintenanceStatus;

const categoryLabels = { maintenance: "Maintenance", property_equipment: "Property equipment", technology: "Technology" };

export function MaintenancePage() {
  const { permissions } = useAccess();
  const { selectedProperty } = useProperties();
  const { maintenanceIssues: issues, setMaintenanceIssues: setIssues } = useAppData();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [period, setPeriod] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const filteredIssues = useMemo(() => issues.filter((issue) => `${issue.title} ${issue.roomNumber} ${issue.area} ${issue.description} ${issue.assignedTo}`.toLowerCase().includes(query.toLowerCase())
    && (category === "all" || issue.category === category)
    && (status === "all" || issue.status === status)
    && (period === "all" || issue.reportedAt.startsWith(period))), [category, issues, period, query, status]);
  const months = Array.from(new Set(issues.map((issue) => issue.reportedAt.slice(0, 7)))).sort().reverse();
  const annualCost = issues.filter((issue) => issue.reportedAt.startsWith("2026")).reduce((sum, issue) => sum + issue.amount, 0);
  const editingIssue = issues.find((issue) => issue.id === editingId);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  function addIssue(draft: MaintenanceDraft) {
    if (!permissions.canManageMaintenance) return;
    setIssues((current) => [{ ...draft, id: crypto.randomUUID() }, ...current]);
    setIsAddOpen(false);
    setToast("Maintenance record saved.");
  }

  function editIssue(draft: MaintenanceDraft) {
    if (!permissions.canManageMaintenance) return;
    setIssues((current) => current.map((issue) => issue.id === editingId ? { ...draft, id: issue.id } : issue));
    setEditingId(null);
    setToast("Maintenance record updated.");
  }

  function advanceStatus(id: string) {
    if (!permissions.canManageMaintenance) return;
    setIssues((current) => current.map((issue) => {
      if (issue.id !== id) return issue;
      if (issue.status === "reported") return { ...issue, status: "in-progress" };
      if (issue.status === "in-progress") return { ...issue, status: "completed", resolvedAt: new Date().toISOString().slice(0, 10) };
      return issue;
    }));
  }

  async function exportReport() {
    try {
      const { downloadMaintenanceReport } = await import("../../reports/maintenanceReport");
      const filters = [query ? `Search: ${query}` : "", category !== "all" ? `Category: ${categoryLabels[category]}` : "", status !== "all" ? `Status: ${status}` : "", period !== "all" ? `Period: ${period}` : ""].filter(Boolean);
      const filename = downloadMaintenanceReport(selectedProperty, filteredIssues, filters);
      setToast(`${filename} downloaded.`);
    } catch (error) {
      console.error("Maintenance report could not be generated.", error);
      setToast("The maintenance PDF could not be generated. Please try again.");
    }
  }

  return (
    <section className="page feature-page maintenance-page">
      <header className="page-header">
        <h1 className="page-title">Maintenance &amp; Costs</h1>
        <div className="page-actions">
          <button className="btn btn-blue btn-sm" onClick={exportReport} type="button"><Icon name="download" />Export PDF</button>
          {permissions.canManageMaintenance && <button className="btn btn-primary btn-sm" onClick={() => setIsAddOpen(true)} type="button"><Icon name="plus" />Log Issue</button>}
        </div>
      </header>

      <section className="collect-card maintenance-cost-card" aria-label="Maintenance cost summary">
        <div className="collect-info">
          <div className="collect-title">Maintenance Total Costs of the Year</div>
          <div className="collect-main maintenance-cost-total">{formatKes(annualCost)}</div>
          <div className="collect-sub">2026 · {issues.length} record{issues.length === 1 ? "" : "s"}</div>
          <div className="collect-sub">{issues.filter((issue) => issue.status !== "completed").length} open · {issues.filter((issue) => issue.status === "completed").length} completed</div>
        </div>
      </section>

      <section className="feature-filter-row maintenance-filter-row" aria-label="Maintenance filters">
        <label className="maintenance-search-field">
          <Icon name="search" size={18} />
          <input aria-label="Search maintenance" className="search-bar" onChange={(event) => setQuery(event.target.value)} placeholder="Issue, room, area..." type="search" value={query} />
        </label>
        <select aria-label="Filter category" className="filter-sel" onChange={(event) => setCategory(event.target.value as CategoryFilter)} value={category}><option value="all">All Categories</option><option value="maintenance">Maintenance</option><option value="property_equipment">Property Equipment</option><option value="technology">Technology</option></select>
        <select aria-label="Filter maintenance status" className="filter-sel" onChange={(event) => setStatus(event.target.value as StatusFilter)} value={status}><option value="all">All Statuses</option><option value="reported">Reported</option><option value="in-progress">In Progress</option><option value="completed">Completed</option></select>
        <select aria-label="Filter period" className="filter-sel" onChange={(event) => setPeriod(event.target.value)} value={period}><option value="all">All Periods</option>{months.map((month) => <option key={month} value={month}>{new Date(`${month}-01`).toLocaleDateString("en-KE", { month: "long", year: "numeric" })}</option>)}</select>
      </section>

      <section className="maint-cards maintenance-record-list">
        {filteredIssues.map((issue) => <article className={`maint-card maintenance-record maintenance-record--${issue.status}`} key={issue.id}>
          <header className="maint-card-header">
            <div><span className="maintenance-category">{categoryLabels[issue.category ?? "maintenance"]}</span><h2 className="maint-card-title">{issue.title}</h2></div>
            <span className={`badge ${issue.status === "completed" ? "badge-resolved" : issue.status === "in-progress" ? "badge-progress" : "badge-open"}`}>{issue.status.replace("-", " ")}</span>
          </header>
          <div className="room-card-body maintenance-record__details">
            <div className="rci"><small className="rci-label">Location</small><strong className="rci-val">{issue.roomNumber ?? issue.area ?? "Shared area"}</strong><span>{issue.location}</span></div>
            <div className="rci"><small className="rci-label">Cost</small><strong className="rci-val">{formatKes(issue.amount)}</strong><span>{issue.quantity ? `${issue.quantity} × ${formatKes(issue.unitCost ?? issue.amount)}` : "Recorded expense"}</span></div>
            <div className="rci"><small className="rci-label">Priority</small><strong className="rci-val">{issue.priority ?? "Medium"}</strong><span>{issue.urgency ?? "Soon"}</span></div>
            <div className="rci"><small className="rci-label">Responsibility</small><strong className="rci-val">{issue.assignedTo || "Unassigned"}</strong><span>Reported by {issue.reportedBy ?? "admin"}</span></div>
          </div>
          <p className="maint-card-meta maintenance-record__description">{issue.description}</p>
          <div className="maint-card-meta maintenance-record__timeline"><Icon name="calendar" size={14} />Reported {formatDate(issue.reportedAt)}{issue.resolvedAt ? ` · Completed ${formatDate(issue.resolvedAt)}` : ""}{issue.assetTag && <> · <code>{issue.assetTag}</code></>}</div>
          {permissions.canManageMaintenance && <div className="maint-card-actions"><button className="btn btn-ghost btn-sm" onClick={() => setEditingId(issue.id)} type="button"><Icon name="edit" size={14} />Edit</button>{issue.status !== "completed" && <button className="btn btn-green btn-sm" onClick={() => advanceStatus(issue.id)} type="button"><Icon name={issue.status === "reported" ? "tools" : "check"} size={14} />{issue.status === "reported" ? "Start Work" : "Mark Complete"}</button>}</div>}
        </article>)}
        {!filteredIssues.length && <div className="feature-empty"><strong>No maintenance records match</strong><p>Clear a filter or log a new issue.</p></div>}
      </section>

      {isAddOpen && permissions.canManageMaintenance && <MaintenanceIssueDialog onClose={() => setIsAddOpen(false)} onSaved={addIssue} />}
      {editingIssue && permissions.canManageMaintenance && <MaintenanceIssueDialog issue={editingIssue} onClose={() => setEditingId(null)} onSaved={editIssue} />}
      {toast && <div aria-live="polite" className="app-toast"><span><Icon name="check" size={16} /></span>{toast}</div>}
    </section>
  );
}
