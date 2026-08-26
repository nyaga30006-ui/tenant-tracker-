import { useEffect, useMemo, useState } from "react";
import { useAppData } from "../../store/AppDataProvider";
import { Icon, type IconName } from "../../components/ui/Icon";
import { formatDate, formatKes } from "../../lib/format";
import type { ElectricityBill } from "../../types/domain";
import { ElectricityBillDialog, type ElectricityBillDraft } from "./ElectricityBillDialog";
import { useAccess } from "../../app/AccessContext";
import { useProperties } from "../../hooks/useProperties";

type AreaFilter = "all" | ElectricityBill["area"];
type BillStatusFilter = "all" | ElectricityBill["status"];

const areaLabels = { apartment: "Apartment", borehole: "Borehole", security: "Security" };
const areaIcons: Record<ElectricityBill["area"], IconName> = { apartment: "building", borehole: "water", security: "lightbulb" };

export function ElectricityPage() {
  const { permissions } = useAccess();
  const { selectedProperty } = useProperties();
  const { electricityBills: bills, setElectricityBills: setBills } = useAppData();
  const [month, setMonth] = useState("all");
  const [area, setArea] = useState<AreaFilter>("all");
  const [status, setStatus] = useState<BillStatusFilter>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const months = Array.from(new Set(bills.map((bill) => bill.month))).sort().reverse();
  const filteredBills = useMemo(() => bills.filter((bill) => (month === "all" || bill.month === month) && (area === "all" || bill.area === area) && (status === "all" || bill.status === status)), [area, bills, month, status]);
  const total = filteredBills.reduce((sum, bill) => sum + bill.amount, 0);
  const editingBill = bills.find((bill) => bill.id === editingId);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  function addBill(draft: ElectricityBillDraft) {
    if (!permissions.canManageElectricity) return;
    setBills((current) => [{ ...draft, id: crypto.randomUUID() }, ...current]);
    setIsAddOpen(false);
    setToast("Electricity bill added.");
  }

  function editBill(draft: ElectricityBillDraft) {
    if (!permissions.canManageElectricity) return;
    setBills((current) => current.map((bill) => bill.id === editingId ? { ...draft, id: bill.id } : bill));
    setEditingId(null);
    setToast("Electricity bill updated.");
  }

  async function exportReport() {
    try {
      const { downloadElectricityReport } = await import("../../reports/electricityReport");
      const filters = [month !== "all" ? `Month: ${month}` : "", area !== "all" ? `Area: ${area}` : "", status !== "all" ? `Status: ${status}` : ""].filter(Boolean);
      const filename = downloadElectricityReport(selectedProperty, filteredBills, filters);
      setToast(`${filename} downloaded.`);
    } catch (error) {
      console.error("Electricity report could not be generated.", error);
      setToast("The electricity PDF could not be generated. Please try again.");
    }
  }

  return (
    <section className="page feature-page electricity-page">
      <header className="page-header">
        <h1 className="page-title">Electricity Bills</h1>
        <div className="page-actions">
          <button className="btn btn-blue btn-sm" onClick={exportReport} type="button"><Icon name="download" />Export PDF</button>
          {permissions.canManageElectricity && <button className="btn btn-primary btn-sm" onClick={() => setIsAddOpen(true)} type="button"><Icon name="plus" />Add Bill</button>}
        </div>
      </header>

      <section className="collect-card electricity-summary-card" aria-label="Electricity bill summary">
        <div className="collect-info">
          <div className="collect-title">Electricity Bills</div>
          <div className="collect-main">{formatKes(total)}</div>
          <div className="collect-sub">{filteredBills.length} bill{filteredBills.length === 1 ? "" : "s"} in the current view</div>
          <div className="collect-sub electricity-summary-status">{filteredBills.filter((bill) => bill.status === "unpaid").length} unpaid · {filteredBills.filter((bill) => bill.status === "paid").length} paid</div>
        </div>
      </section>

      <section className="psum-bar electricity-area-summary" aria-label="Electricity totals by area">
        {(["security", "apartment", "borehole"] as const).map((meterArea) => <div className="psum-item" key={meterArea}><span className="psum-label"><Icon name={areaIcons[meterArea]} size={14} />{areaLabels[meterArea]}</span><strong className="psum-val">{formatKes(filteredBills.filter((bill) => bill.area === meterArea).reduce((sum, bill) => sum + bill.amount, 0))}</strong><small>{filteredBills.filter((bill) => bill.area === meterArea && bill.status === "unpaid").length ? "Payment due" : "Up to date"}</small></div>)}
      </section>

      <section className="feature-filter-row electricity-filter-row" aria-label="Electricity filters">
        <select aria-label="Filter billing month" className="filter-sel" onChange={(event) => setMonth(event.target.value)} value={month}><option value="all">All Months</option>{months.map((value) => <option key={value} value={value}>{new Date(`${value}-01`).toLocaleDateString("en-KE", { month: "long", year: "numeric" })}</option>)}</select>
        <select aria-label="Filter meter area" className="filter-sel" onChange={(event) => setArea(event.target.value as AreaFilter)} value={area}><option value="all">All Areas</option><option value="security">Security</option><option value="apartment">Apartment</option><option value="borehole">Borehole</option></select>
        <select aria-label="Filter bill status" className="filter-sel" onChange={(event) => setStatus(event.target.value as BillStatusFilter)} value={status}><option value="all">All Statuses</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option></select>
      </section>

      <section className="maint-cards electricity-record-list">
        {filteredBills.map((bill) => <article className={`maint-card electricity-record electricity-record--${bill.status} electricity-record--${bill.area}`} key={bill.id}>
          <header className="maint-card-header"><div className="electricity-record__identity"><span className="electricity-area-icon"><Icon name={areaIcons[bill.area]} size={20} /></span><div><small>{areaLabels[bill.area]}</small><h2 className="maint-card-title">{new Date(`${bill.month}-01`).toLocaleDateString("en-KE", { month: "long", year: "numeric" })}</h2></div></div><span className={`badge ${bill.status === "paid" ? "badge-paid" : "badge-unpaid"}`}>{bill.status}</span></header>
          <div className="room-card-body electricity-record__body"><div className="rci"><small className="rci-label">Amount</small><strong className="rci-val">{formatKes(bill.amount)}</strong></div><div className="rci"><small className="rci-label">Due Date</small><strong className="rci-val">{formatDate(bill.dueDate)}</strong></div><div className="rci"><small className="rci-label">Recorded By</small><strong className="rci-val">{bill.recordedBy}</strong></div></div>
          {bill.note && <p className="maint-card-meta electricity-record__note">{bill.note}</p>}
          <div className="maint-card-meta electricity-record__reference"><code>{bill.id.toUpperCase()}</code></div>
          {permissions.canManageElectricity && <div className="maint-card-actions"><button className="btn btn-ghost btn-sm" onClick={() => setEditingId(bill.id)} type="button"><Icon name="edit" size={14} />Edit</button>{bill.status === "unpaid" && <button className="btn btn-green btn-sm" onClick={() => setBills((current) => current.map((item) => item.id === bill.id ? { ...item, status: "paid" } : item))} type="button"><Icon name="check" size={14} />Mark Paid</button>}</div>}
        </article>)}
        {!filteredBills.length && <div className="feature-empty"><strong>No electricity bills match</strong><p>Change a filter or add a bill.</p></div>}
      </section>

      {isAddOpen && permissions.canManageElectricity && <ElectricityBillDialog onClose={() => setIsAddOpen(false)} onSaved={addBill} />}
      {editingBill && permissions.canManageElectricity && <ElectricityBillDialog bill={editingBill} onClose={() => setEditingId(null)} onSaved={editBill} />}
      {toast && <div aria-live="polite" className="app-toast"><span><Icon name="check" size={16} /></span>{toast}</div>}
    </section>
  );
}
