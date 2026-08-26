import { useEffect, useMemo, useState } from "react";
import { usePayments } from "../../hooks/usePayments";
import { useRooms } from "../../hooks/useRooms";
import { useTenantResidencies } from "../../hooks/useTenantResidencies";
import { Icon } from "../../components/ui/Icon";
import { formatKes } from "../../lib/format";
import type { Payment, PaymentMethod, PaymentType, ResidencyStatus } from "../../types/domain";
import { PaymentCard } from "./components/PaymentCard";
import { DailyPaymentReviewDialog } from "./DailyPaymentReviewDialog";
import { PaymentCorrectionDialog } from "./PaymentCorrectionDialog";
import { useAccess } from "../../app/AccessContext";
import { useProperties } from "../../hooks/useProperties";
import { propertyReceiptPrefix } from "../../lib/receiptNumbers";
import { applyPaymentCorrectionToResidency, applyPaymentCorrectionToRoom } from "./paymentLedger";

type AllPaymentMethod = "all" | PaymentMethod;
type AllPaymentType = "all" | PaymentType;
type AllResidency = "all" | ResidencyStatus;
type PaymentSort = "newest" | "oldest" | "amount-high" | "amount-low";

function monthLabel(value: string) {
  return new Intl.DateTimeFormat("en-KE", { month: "long", timeZone: "UTC", year: "numeric" }).format(new Date(`${value}-01T00:00:00Z`));
}

export function PaymentsPage() {
  const { permissions } = useAccess();
  const { selectedProperty } = useProperties();
  const { payments, setPayments } = usePayments();
  const { rooms, setRooms } = useRooms();
  const { setTenantResidencies } = useTenantResidencies();
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState("all");
  const [roomId, setRoomId] = useState("all");
  const [paymentType, setPaymentType] = useState<AllPaymentType>("all");
  const [method, setMethod] = useState<AllPaymentMethod>("all");
  const [residency, setResidency] = useState<AllResidency>("all");
  const [sort, setSort] = useState<PaymentSort>("newest");
  const [isDailyReviewOpen, setIsDailyReviewOpen] = useState(false);
  const [correctionPaymentId, setCorrectionPaymentId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const months = useMemo(() => Array.from(new Set(payments.map((payment) => payment.receivedAt.slice(0, 7)))).sort().reverse(), [payments]);
  const correctionPayment = payments.find((payment) => payment.id === correctionPaymentId);

  const filteredPayments = useMemo(() => payments.filter((payment) => {
    const room = rooms.find((item) => item.id === payment.roomId);
    const searchable = `${payment.tenant} ${payment.reference} ${payment.receiptNo} ${payment.recordedBy} ${room?.number}`.toLowerCase();
    return searchable.includes(query.toLowerCase())
      && (month === "all" || payment.receivedAt.startsWith(month))
      && (roomId === "all" || payment.roomId === roomId)
      && (paymentType === "all" || (payment.paymentType ?? "rent") === paymentType)
      && (method === "all" || payment.method === method)
      && (residency === "all" || (payment.residency ?? "current") === residency);
  }).sort((a, b) => {
    if (sort === "oldest") return new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime();
    if (sort === "amount-high") return b.amount - a.amount;
    if (sort === "amount-low") return a.amount - b.amount;
    return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
  }), [method, month, paymentType, payments, query, residency, roomId, rooms, sort]);

  const total = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const rentTotal = filteredPayments.filter((payment) => (payment.paymentType ?? "rent") === "rent").reduce((sum, payment) => sum + payment.amount, 0);
  const electricityTotal = filteredPayments.filter((payment) => payment.paymentType === "electricity").reduce((sum, payment) => sum + payment.amount, 0);
  const depositTotal = filteredPayments.filter((payment) => payment.paymentType === "deposit").reduce((sum, payment) => sum + payment.amount, 0);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  function clearFilters() {
    setQuery("");
    setMonth("all");
    setRoomId("all");
    setPaymentType("all");
    setMethod("all");
    setResidency("all");
    setSort("newest");
  }

  async function exportReport() {
    try {
      const { downloadPaymentsReport } = await import("../../reports/paymentsReport");
      const filters = [query ? `Search: ${query}` : "", month !== "all" ? `Month: ${monthLabel(month)}` : "", roomId !== "all" ? `Room: ${rooms.find((room) => room.id === roomId)?.number ?? roomId}` : "", paymentType !== "all" ? `Type: ${paymentType}` : "", method !== "all" ? `Method: ${method}` : "", residency !== "all" ? `Residency: ${residency}` : ""].filter(Boolean);
      const filename = downloadPaymentsReport(selectedProperty, filteredPayments, rooms, filters);
      setToast(`${filename} downloaded.`);
    } catch (error) {
      console.error("Payment report could not be generated.", error);
      setToast("The payment PDF could not be generated. Please try again.");
    }
  }

  function saveCorrection(payment: Payment) {
    if (!permissions.canCorrectPayments) return;
    const previousPayment = payments.find((item) => item.id === payment.id);
    if (previousPayment) {
      setTenantResidencies((current) => current.map((item) => applyPaymentCorrectionToResidency(item, previousPayment, payment)));
      setRooms((current) => current.map((room) => applyPaymentCorrectionToRoom(room, previousPayment, payment)));
    }
    setPayments((current) => current.map((item) => item.id === payment.id ? payment : item));
    setCorrectionPaymentId(null);
    setToast(`${payment.receiptNo ?? payment.reference} was corrected.`);
  }

  return (
    <section className="page feature-page payments-page">
      <header className="page-header">
        <h1 className="page-title">Payment Records</h1>
        <div className="page-actions"><button className="btn btn-green btn-sm" onClick={() => setIsDailyReviewOpen(true)} type="button"><Icon name="calendar" />Daily Review</button><button className="btn btn-blue btn-sm" onClick={exportReport} type="button"><Icon name="download" />Export PDF</button><button className="btn btn-ghost btn-sm" onClick={clearFilters} type="button"><Icon name="close" />Clear Filters</button></div>
      </header>

      <section className="pf-grid">
        <input aria-label="Search payments" onChange={(event) => setQuery(event.target.value)} placeholder="🔎 Tenant, room, serial..." type="search" value={query} />
        <select aria-label="Filter month" onChange={(event) => setMonth(event.target.value)} value={month}><option value="all">All Months</option>{months.map((value) => <option key={value} value={value}>{monthLabel(value)}</option>)}</select>
        <select aria-label="Filter room" onChange={(event) => setRoomId(event.target.value)} value={roomId}><option value="all">All Rooms</option>{rooms.map((room) => <option key={room.id} value={room.id}>{room.number}</option>)}</select>
        <select aria-label="Filter payment type" onChange={(event) => setPaymentType(event.target.value as AllPaymentType)} value={paymentType}><option value="all">All Types</option><option value="rent">Rent / Balance</option><option value="electricity">Electricity Fee</option><option value="deposit">Deposits</option></select>
        <select aria-label="Filter payment method" onChange={(event) => setMethod(event.target.value as AllPaymentMethod)} value={method}><option value="all">All Methods</option><option value="mpesa">M-Pesa</option><option value="bank">Bank</option><option value="cash">Cash</option></select>
        <select aria-label="Filter residency" onChange={(event) => setResidency(event.target.value as AllResidency)} value={residency}><option value="all">All Residency</option><option value="current">Current</option><option value="former">Former</option></select>
        <select aria-label="Sort payments" onChange={(event) => setSort(event.target.value as PaymentSort)} value={sort}><option value="newest">Newest First</option><option value="oldest">Oldest First</option><option value="amount-high">Highest Amount</option><option value="amount-low">Lowest Amount</option></select>
      </section>

      <section className="psum-bar" aria-label="Filtered payment totals">
        <div className="psum-item"><div className="psum-label">Records</div><div className="psum-val">{filteredPayments.length}</div></div>
        <div className="psum-item"><div className="psum-label">Total</div><div className="psum-val psum-val--green">{formatKes(total)}</div></div>
        <div className="psum-item"><div className="psum-label">Rent / Balance</div><div className="psum-val">{formatKes(rentTotal)}</div></div>
        <div className="psum-item"><div className="psum-label">Electricity Fee</div><div className="psum-val psum-val--blue">{formatKes(electricityTotal)}</div></div>
        <div className="psum-item"><div className="psum-label">Deposits</div><div className="psum-val psum-val--orange">{formatKes(depositTotal)}</div></div>
      </section>

      <section className="payment-list" aria-live="polite">
        {filteredPayments.map((payment) => <PaymentCard canCorrect={permissions.canCorrectPayments} key={payment.id} onCorrect={setCorrectionPaymentId} payment={payment} room={rooms.find((room) => room.id === payment.roomId)} />)}
        {!filteredPayments.length && <div className="feature-empty"><Icon name="payments" size={25} /><strong>No matching payments</strong><p>Clear a filter or search for another tenant, room, or serial number.</p></div>}
      </section>

      {isDailyReviewOpen && <DailyPaymentReviewDialog onClose={() => setIsDailyReviewOpen(false)} payments={payments} />}
      {correctionPayment && permissions.canCorrectPayments && <PaymentCorrectionDialog onClose={() => setCorrectionPaymentId(null)} onSaved={saveCorrection} payment={correctionPayment} payments={payments} receiptPrefix={propertyReceiptPrefix(selectedProperty.name)} />}
      {toast && <div aria-live="polite" className="app-toast"><span><Icon name="check" size={16} /></span>{toast}</div>}
    </section>
  );
}
