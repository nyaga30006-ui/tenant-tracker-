import { useEffect, useMemo, useState } from "react";
import { useAccess } from "../../app/AccessContext";
import { Icon } from "../../components/ui/Icon";
import { useProperties } from "../../hooks/useProperties";
import { useWater } from "../../hooks/useWater";
import { formatDate, formatKes } from "../../lib/format";
import type { WaterPurchaseBill } from "../../types/domain";
import { WaterBillDialog, type WaterBillDraft } from "./WaterBillDialog";
import { WaterCollectionCard } from "./WaterCollectionCard";
import type { WaterMeterDraft } from "./WaterMeterDialog";
import type { WaterMeterReadingDraft } from "./WaterMeterReadingDialog";
import { WaterMetersSection } from "./WaterMetersSection";
import { WaterSetupDialog } from "./WaterSetupDialog";

function monthLabel(value: string): string {
  return new Date(`${value}-01T00:00:00`).toLocaleDateString("en-KE", { month: "long", year: "numeric" });
}

export function WaterPage() {
  const { permissions } = useAccess();
  const { selectedProperty } = useProperties();
  const { isWaterConfigurationLoading, setWaterConfiguration, setWaterMeterReadings, setWaterMeters, setWaterPurchaseBills, waterConfiguration, waterMeterReadings, waterMeters, waterPurchaseBills } = useWater();
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [billStatusFilter, setBillStatusFilter] = useState<"all" | WaterPurchaseBill["status"]>("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const billMonths = Array.from(new Set(waterPurchaseBills.map((bill) => bill.month))).sort().reverse();
  const filteredBills = useMemo(() => waterPurchaseBills
    .filter((bill) => bill.supplier.toLowerCase().includes(search.toLowerCase()))
    .filter((bill) => monthFilter === "all" || bill.month === monthFilter)
    .filter((bill) => billStatusFilter === "all" || bill.status === billStatusFilter)
    .sort((a, b) => b.month.localeCompare(a.month)), [billStatusFilter, monthFilter, search, waterPurchaseBills]);

  const customerAccounts = useMemo(() => waterMeters.map((meter) => {
    const readings = waterMeterReadings.filter((reading) => reading.meterId === meter.id);
    return {
      billed: readings.reduce((total, reading) => total + reading.amountDue, 0),
      id: meter.id,
      meterNumber: meter.meterNumber,
      name: meter.customerName,
      paid: readings.reduce((total, reading) => total + Math.min(reading.amountPaid, reading.amountDue), 0),
      volume: readings.reduce((total, reading) => total + reading.consumptionM3, 0),
    };
  }).sort((a, b) => b.billed - a.billed), [waterMeterReadings, waterMeters]);

  if (isWaterConfigurationLoading) {
    return (
      <section className="page feature-page water-page">
        <div aria-live="polite" className="card water-empty-setup"><span><Icon name="water" size={34} /></span><h1>Loading water workspace</h1><p>Checking the selected property’s water setup and meter records.</p></div>
      </section>
    );
  }

  if (!waterConfiguration) {
    return (
      <section className="page feature-page water-page">
        <div className="card water-empty-setup"><span><Icon name="water" size={34} /></span><h1>Water is not configured for {selectedProperty.name}</h1><p>{permissions.canConfigureWater ? "Choose whether this property sells water through registered meters or tracks purchased-water bills." : "Ask the administrator to configure the water workflow for this property."}</p>{permissions.canConfigureWater && <button className="btn btn-primary" onClick={() => setIsSetupOpen(true)} type="button">Choose water scenario</button>}</div>
        {isSetupOpen && permissions.canConfigureWater && <WaterSetupDialog onClose={() => setIsSetupOpen(false)} onSaved={(configuration) => { setWaterConfiguration(configuration); setIsSetupOpen(false); }} propertyName={selectedProperty.name} />}
      </section>
    );
  }

  const editingBill = waterPurchaseBills.find((bill) => bill.id === editingBillId);
  const totalBilled = waterMeterReadings.reduce((total, reading) => total + reading.amountDue, 0);
  const totalReceived = waterMeterReadings.reduce((total, reading) => total + Math.min(reading.amountPaid, reading.amountDue), 0);
  const totalVolumeSold = waterMeterReadings.reduce((total, reading) => total + reading.consumptionM3, 0);
  const totalPurchaseBills = waterPurchaseBills.reduce((total, bill) => total + bill.amount, 0);
  const unpaidPurchaseBills = waterPurchaseBills.filter((bill) => bill.status === "unpaid").reduce((total, bill) => total + bill.amount, 0);
  const purchasedVolume = waterPurchaseBills.reduce((total, bill) => total + (bill.volumeM3 ?? 0), 0);

  function addBill(draft: WaterBillDraft) {
    if (!permissions.canManageWater) return;
    setWaterPurchaseBills((current) => [{ ...draft, id: crypto.randomUUID() }, ...current]);
    setIsAddOpen(false);
    setToast("Water bill added.");
  }

  function editBill(draft: WaterBillDraft) {
    if (!permissions.canManageWater) return;
    setWaterPurchaseBills((current) => current.map((bill) => bill.id === editingBillId ? { ...draft, id: bill.id } : bill));
    setEditingBillId(null);
    setToast("Water bill updated.");
  }

  function registerMeter(draft: WaterMeterDraft) {
    if (!permissions.canConfigureWater) return;
    setWaterMeters((current) => [...current, { ...draft, id: crypto.randomUUID(), status: "active" }]);
    setToast(`${draft.meterNumber} was registered.`);
  }

  function updateMeter(meterId: string, draft: WaterMeterDraft) {
    if (!permissions.canConfigureWater) return;
    setWaterMeters((current) => current.map((meter) => meter.id === meterId ? { ...meter, ...draft } : meter));
    setToast(`${draft.meterNumber} settings updated.`);
  }

  function addMeterReading(meterId: string, draft: WaterMeterReadingDraft) {
    if (!permissions.canManageWater) return;
    setWaterMeterReadings((current) => [{ ...draft, id: crypto.randomUUID(), meterId }, ...current]);
    setToast(`${draft.consumptionM3.toLocaleString("en-KE", { maximumFractionDigits: 1 })} m³ billed automatically.`);
  }

  function markMeterReadingPaid(readingId: string) {
    if (!permissions.canManageWater) return;
    setWaterMeterReadings((current) => current.map((reading) => reading.id === readingId ? { ...reading, amountPaid: reading.amountDue } : reading));
    setToast("Meter bill marked as paid.");
  }

  async function exportReport() {
    if (!waterConfiguration) return;
    try {
      const { downloadWaterReport } = await import("../../reports/waterReport");
      const bills = waterConfiguration.mode === "buyer" ? filteredBills : waterPurchaseBills;
      const filters = waterConfiguration.mode === "buyer" ? [search ? `Search: ${search}` : "", monthFilter !== "all" ? `Month: ${monthLabel(monthFilter)}` : "", billStatusFilter !== "all" ? `Status: ${billStatusFilter}` : ""].filter(Boolean) : [];
      const filename = downloadWaterReport(selectedProperty, waterConfiguration, waterMeters, waterMeterReadings, bills, filters);
      setToast(`${filename} downloaded.`);
    } catch (error) {
      console.error("Water report could not be generated.", error);
      setToast("The water PDF could not be generated. Please try again.");
    }
  }

  return (
    <section className="page feature-page water-page">
      <header className="page-header water-page-header">
        <div><span className="water-mode-label">{waterConfiguration.mode === "seller" ? "Metered water income" : "Purchased water expenses"}</span><h1 className="page-title">Water</h1><p>{waterConfiguration.serviceName}</p></div>
        <div className="page-actions"><button className="btn btn-blue btn-sm" onClick={exportReport} type="button"><Icon name="download" />Export PDF</button>{permissions.canConfigureWater && <button className="btn btn-ghost btn-sm" onClick={() => setIsSetupOpen(true)} type="button">Water Settings</button>}{permissions.canManageWater && waterConfiguration.mode === "buyer" && <button className="btn btn-primary btn-sm" onClick={() => setIsAddOpen(true)} type="button"><Icon name="plus" />Add Bill</button>}</div>
      </header>

      {waterConfiguration.mode === "seller" ? (
        <>
          <WaterCollectionCard />
          <section className="psum-bar water-kpi-grid" aria-label="Metered water sales summary">
            <article className="psum-item"><small className="psum-label">Total billed</small><strong className="psum-val">{formatKes(totalBilled)}</strong><span>{waterMeterReadings.length} monthly meter readings</span></article>
            <article className="psum-item"><small className="psum-label">Payments received</small><strong className="psum-val">{formatKes(totalReceived)}</strong><span>{totalBilled ? Math.round(totalReceived / totalBilled * 100) : 0}% collection rate</span></article>
            <article className="psum-item"><small className="psum-label">Outstanding</small><strong className="psum-val">{formatKes(Math.max(0, totalBilled - totalReceived))}</strong><span>Follow up unpaid meter accounts</span></article>
            <article className="psum-item"><small className="psum-label">Volume supplied</small><strong className="psum-val">{totalVolumeSold.toLocaleString("en-KE", { maximumFractionDigits: 1 })} m³</strong><span>{waterMeters.length} registered meter accounts</span></article>
          </section>

          <WaterMetersSection canManage={permissions.canManageWater} canRegister={permissions.canConfigureWater} defaultRate={waterConfiguration.defaultRatePerM3} meters={waterMeters} onMarkFullyPaid={markMeterReadingPaid} onReadingAdded={addMeterReading} onRegisterMeter={registerMeter} onUpdateMeter={updateMeter} readings={waterMeterReadings} />

          <section className="card water-customer-ledger">
            <header className="card-heading"><div><small className="card-title">Meter collection summary</small><h2>Apartment meter accounts</h2></div><span className="badge badge-current">{customerAccounts.length} accounts</span></header>
            <div className="water-customer-grid">
              {customerAccounts.map((account) => <article className="pay-row" key={account.id}><div className="pay-row-top"><span className="pay-serial">{account.meterNumber}</span><strong className="pay-row-amount">{formatKes(account.paid)}</strong></div><div className="pay-row-room">{account.name}</div><div className="pay-row-meta">{account.volume.toLocaleString("en-KE", { maximumFractionDigits: 1 })} m³ used · {formatKes(account.billed)} billed</div><div className="pay-row-badges"><span className={`badge ${account.billed - account.paid > 0 ? "badge-unpaid" : "badge-paid"}`}>{formatKes(Math.max(0, account.billed - account.paid))} due</span><span className="badge badge-current">Meter account</span></div></article>)}
              {!customerAccounts.length && <div className="feature-empty"><span><Icon name="water" /></span><strong>No meter accounts yet</strong><p>Register the first apartment water meter above.</p></div>}
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="psum-bar water-kpi-grid" aria-label="Purchased water summary">
            <article className="psum-item"><small className="psum-label">Total water bills</small><strong className="psum-val">{formatKes(totalPurchaseBills)}</strong><span>{waterPurchaseBills.length} recorded bills</span></article>
            <article className="psum-item"><small className="psum-label">Amount unpaid</small><strong className="psum-val">{formatKes(unpaidPurchaseBills)}</strong><span>{waterPurchaseBills.filter((bill) => bill.status === "unpaid").length} bills need payment</span></article>
            <article className="psum-item"><small className="psum-label">Amount paid</small><strong className="psum-val">{formatKes(totalPurchaseBills - unpaidPurchaseBills)}</strong><span>Completed supplier payments</span></article>
            <article className="psum-item"><small className="psum-label">Recorded consumption</small><strong className="psum-val">{purchasedVolume.toLocaleString("en-KE", { maximumFractionDigits: 2 })} m³</strong><span>Volume is optional per bill</span></article>
          </section>

          <section className="feature-filter-row water-filter-row" aria-label="Water bill filters">
            <input aria-label="Search water suppliers" className="search-bar" onChange={(event) => setSearch(event.target.value)} placeholder="Search supplier..." type="search" value={search} />
            <select aria-label="Filter water billing month" className="filter-sel" onChange={(event) => setMonthFilter(event.target.value)} value={monthFilter}><option value="all">All Months</option>{billMonths.map((month) => <option key={month} value={month}>{monthLabel(month)}</option>)}</select>
            <select aria-label="Filter water bill status" className="filter-sel" onChange={(event) => setBillStatusFilter(event.target.value as typeof billStatusFilter)} value={billStatusFilter}><option value="all">All Statuses</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option></select>
          </section>

          <section className="maint-cards water-record-list">
            {filteredBills.map((bill) => <article className={`maint-card water-record water-record--${bill.status}`} key={bill.id}><header className="maint-card-header"><div className="water-record__identity"><span className="water-channel water-channel--supplier">SUP</span><div><small>{monthLabel(bill.month)}</small><h2 className="maint-card-title">{bill.supplier}</h2></div></div><span className={`badge ${bill.status === "paid" ? "badge-paid" : "badge-unpaid"}`}>{bill.status}</span></header><div className="room-card-body water-record__details"><div className="rci"><small className="rci-label">Bill amount</small><strong className="rci-val">{formatKes(bill.amount)}</strong></div><div className="rci"><small className="rci-label">Consumption</small><strong className="rci-val">{bill.volumeM3 ? `${bill.volumeM3.toLocaleString("en-KE", { maximumFractionDigits: 2 })} m³` : "Not recorded"}</strong></div><div className="rci"><small className="rci-label">Due date</small><strong className="rci-val">{formatDate(bill.dueDate)}</strong></div><div className="rci"><small className="rci-label">Reference</small><strong className="rci-val">{bill.reference || "—"}</strong></div></div><div className="maint-card-meta"><strong>{bill.status === "paid" ? "Payment completed" : "Payment pending"}</strong> · {bill.note || "No additional notes"}</div>{permissions.canManageWater && <div className="maint-card-actions"><button className="btn btn-ghost btn-sm" onClick={() => setEditingBillId(bill.id)} type="button">Edit</button>{bill.status === "unpaid" && <button className="btn btn-green btn-sm" onClick={() => setWaterPurchaseBills((current) => current.map((item) => item.id === bill.id ? { ...item, status: "paid" } : item))} type="button">Mark Paid</button>}</div>}</article>)}
            {!filteredBills.length && <div className="feature-empty"><span><Icon name="water" /></span><strong>{waterPurchaseBills.length ? "No water bills match" : "No water bills yet"}</strong><p>{waterPurchaseBills.length ? "Change the search or filters." : "Add the first supplier bill for this property."}</p></div>}
          </section>
        </>
      )}

      {isSetupOpen && permissions.canConfigureWater && <WaterSetupDialog configuration={waterConfiguration} onClose={() => setIsSetupOpen(false)} onSaved={(configuration) => { setWaterConfiguration(configuration); setIsSetupOpen(false); setToast("Water settings saved."); }} propertyName={selectedProperty.name} />}
      {isAddOpen && permissions.canManageWater && waterConfiguration.mode === "buyer" && <WaterBillDialog defaultSupplier={waterConfiguration.defaultSupplier} existingBills={waterPurchaseBills} onClose={() => setIsAddOpen(false)} onSaved={addBill} />}
      {editingBill && permissions.canManageWater && <WaterBillDialog bill={editingBill} defaultSupplier={waterConfiguration.defaultSupplier} existingBills={waterPurchaseBills} onClose={() => setEditingBillId(null)} onSaved={editBill} />}
      {toast && <div aria-live="polite" className="app-toast"><span><Icon name="check" size={16} /></span>{toast}</div>}
    </section>
  );
}
