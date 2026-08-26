import { useEffect, useMemo, useState } from "react";
import { usePayments } from "../../hooks/usePayments";
import { useRooms } from "../../hooks/useRooms";
import { useTenantResidencies } from "../../hooks/useTenantResidencies";
import { Icon } from "../../components/ui/Icon";
import { formatKes } from "../../lib/format";
import { nextBillingResetDate } from "../../lib/billingSchedule";
import { propertyReceiptPrefix } from "../../lib/receiptNumbers";
import { findDuplicatePaymentReference } from "../../lib/validation";
import { useProperties } from "../../hooks/useProperties";
import { useAccess } from "../../app/AccessContext";
import type { Payment, PaymentProvider, Room, RoomStatus, TenantResidency } from "../../types/domain";
import { RecordPaymentDialog, type RecordedPaymentDraft } from "../payments/RecordPaymentDialog";
import { AddRoomDialog, type RoomDraft } from "./AddRoomDialog";
import { RoomCard } from "./components/RoomCard";
import { RoomHistoryDialog } from "./RoomHistoryDialog";
import { calculatedRoomStatus, roomBalance } from "./roomFinance";
import { SetBookDialog, type SetBookDraft } from "./SetBookDialog";
import { MoveInTenantDialog, type MoveInTenantDraft } from "./MoveInTenantDialog";
import { MoveOutTenantDialog, type MoveOutTenantDraft } from "./MoveOutTenantDialog";
import { applyPaymentToRoom } from "../payments/paymentLedger";

type RoomFilter = "all" | RoomStatus;

function nextResetLabel(resetDay: number) {
  return new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "long", year: "numeric" }).format(nextBillingResetDate(resetDay));
}

function paymentProvider(method: RecordedPaymentDraft["method"]): PaymentProvider {
  if (method === "mpesa") return "mpesa";
  if (method === "bank") return "kcb";
  return "manual";
}

export function RoomsPage() {
  const { currentUser, permissions } = useAccess();
  const { selectedProperty } = useProperties();
  const { payments, recordPayment, setPayments } = usePayments();
  const { rooms, setRooms } = useRooms();
  const { setTenantResidencies, tenantResidencies } = useTenantResidencies();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RoomFilter>("all");
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [historyRoomId, setHistoryRoomId] = useState<string | null>(null);
  const [paymentRoomId, setPaymentRoomId] = useState<string | null>(null);
  const [setBookRoomId, setSetBookRoomId] = useState<string | null>(null);
  const [moveInRoomId, setMoveInRoomId] = useState<string | null>(null);
  const [moveOutRoomId, setMoveOutRoomId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const filteredRooms = useMemo(() => rooms.filter((room) => {
    const matchesQuery = `${room.number} ${room.tenant} ${room.floor}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (filter === "all" || calculatedRoomStatus(room) === filter);
  }), [filter, query, rooms]);

  const vacantCount = rooms.filter((room) => calculatedRoomStatus(room) === "vacant").length;
  const collectionCount = rooms.filter((room) => ["partial", "unpaid"].includes(calculatedRoomStatus(room))).length;
  const outstanding = rooms.reduce((total, room) => total + Math.max(0, roomBalance(room)), 0);
  const editingRoom = rooms.find((room) => room.id === editingRoomId);
  const historyRoom = rooms.find((room) => room.id === historyRoomId);
  const setBookRoom = rooms.find((room) => room.id === setBookRoomId);
  const moveInRoom = rooms.find((room) => room.id === moveInRoomId);
  const moveOutRoom = rooms.find((room) => room.id === moveOutRoomId);
  const moveOutResidency = moveOutRoom?.activeResidencyId
    ? tenantResidencies.find((residency) => residency.id === moveOutRoom.activeResidencyId)
    : undefined;

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  function addRoom(draft: RoomDraft) {
    if (!permissions.canManageRooms) return;
    const room: Room = {
      ...draft,
      id: crypto.randomUUID(),
      tenant: "",
      paid: 0,
      arrears: 0,
      credit: 0,
      status: "vacant",
      depositPaid: 0,
      depositRequired: draft.rent,
      depositDueEnabled: false,
      electricityFee: 2500,
    };
    setRooms((current) => [...current, room]);
    setIsAddRoomOpen(false);
    setToast(`${room.number} was added.`);
  }

  function editRoom(draft: RoomDraft) {
    if (!permissions.canManageRooms) return;
    if (!editingRoomId) return;
    setRooms((current) => current.map((room) => {
      if (room.id !== editingRoomId) return room;
      const next = { ...room, ...draft };
      return { ...next, status: calculatedRoomStatus(next) };
    }));
    setEditingRoomId(null);
    setToast(`${draft.number} was updated.`);
  }

  function moveTenantIn(draft: MoveInTenantDraft) {
    if (!permissions.canManageRooms || !moveInRoom || moveInRoom.tenant) return;
    const residencyId = crypto.randomUUID();
    const moveInDay = Number(draft.moveInDate.slice(8, 10));
    const residency: TenantResidency = {
      depositHeld: draft.depositHeld,
      id: residencyId,
      moveInDate: draft.moveInDate,
      moveInNote: draft.moveInNote || undefined,
      movedInBy: currentUser.username,
      roomId: moveInRoom.id,
      status: "active",
      tenantName: draft.tenantName,
      tenantPhone: draft.tenantPhone || undefined,
    };
    setTenantResidencies((current) => [residency, ...current]);
    setRooms((current) => current.map((room) => {
      if (room.id !== moveInRoom.id) return room;
      const next: Room = {
        ...room,
        activeResidencyId: residencyId,
        arrears: 0,
        bookBalanceDue: undefined,
        bookNote: undefined,
        bookSetAt: undefined,
        bookSetBy: undefined,
        credit: 0,
        depositDueEnabled: draft.depositRequired > 0,
        depositPaid: draft.depositHeld,
        depositRequired: draft.depositRequired,
        electricityDueEnabled: draft.electricityDueEnabled,
        lastResetMonth: moveInDay > selectedProperty.billingResetDay ? draft.moveInDate.slice(0, 7) : undefined,
        paid: 0,
        rent: draft.rent,
        status: "unpaid",
        tenant: draft.tenantName,
      };
      return { ...next, status: calculatedRoomStatus(next) };
    }));
    setMoveInRoomId(null);
    setToast(`${draft.tenantName} moved into ${moveInRoom.number}.`);
  }

  function moveTenantOut(draft: MoveOutTenantDraft) {
    if (!permissions.canManageRooms || !moveOutRoom || !moveOutRoom.tenant || !moveOutRoom.activeResidencyId) return;
    const residencyId = moveOutRoom.activeResidencyId;
    const tenantName = moveOutRoom.tenant;
    const depositHeld = moveOutRoom.depositPaid ?? 0;
    setTenantResidencies((current) => current.map((residency) => residency.id === residencyId ? {
      ...residency,
      deductionNote: draft.deductionNote || undefined,
      depositAppliedToBalance: draft.depositAppliedToBalance,
      depositDeducted: draft.depositDeducted,
      depositHeld,
      depositRefunded: draft.depositRefunded,
      finalBalance: draft.finalBalance,
      moveOutDate: draft.moveOutDate,
      moveOutNote: draft.moveOutNote || undefined,
      movedOutBy: currentUser.username,
      status: "former",
    } : residency));
    setPayments((current) => current.map((payment) => {
      const belongsToResidency = payment.residencyId === residencyId
        || (!payment.residencyId && payment.roomId === moveOutRoom.id && (payment.residency ?? "current") === "current");
      return belongsToResidency ? { ...payment, residency: "former", residencyId } : payment;
    }));
    setRooms((current) => current.map((room) => room.id === moveOutRoom.id ? {
      ...room,
      activeResidencyId: undefined,
      arrears: 0,
      bookBalanceDue: undefined,
      bookNote: undefined,
      bookSetAt: undefined,
      bookSetBy: undefined,
      credit: 0,
      depositDueEnabled: false,
      depositPaid: 0,
      depositRequired: room.rent,
      lastResetMonth: undefined,
      paid: 0,
      status: "vacant",
      tenant: "",
    } : room));
    setMoveOutRoomId(null);
    setToast(`${tenantName} moved out. ${moveOutRoom.number} is ready for the next tenant.`);
  }

  async function savePayment(draft: RecordedPaymentDraft) {
    if (!permissions.canRecordPayments) return;
    const paymentRoom = rooms.find((room) => room.id === draft.roomId);
    if (!paymentRoom?.tenant || !paymentRoom.activeResidencyId) {
      setToast("Payment not saved: this room does not have a current tenant residency.");
      return;
    }
    if (draft.method !== "cash" && findDuplicatePaymentReference(payments, draft.reference)) {
      setToast("Payment not saved: that M-Pesa or bank reference already exists.");
      return;
    }
    const roomAfterPayment = applyPaymentToRoom(paymentRoom, draft.paymentType, draft.amount);
    const payment: Payment = {
      id: crypto.randomUUID(),
      roomId: draft.roomId,
      tenant: draft.tenant,
      amount: draft.amount,
      method: draft.method,
      provider: paymentProvider(draft.method),
      status: "confirmed",
      reference: draft.reference || `MANUAL-${Date.now().toString().slice(-6)}`,
      receivedAt: `${draft.receivedAt}T12:00:00+03:00`,
      receiptNo: draft.receiptNo,
      paymentType: draft.paymentType,
      residency: "current",
      residencyId: paymentRoom.activeResidencyId,
      recordedBy: draft.recordedBy,
      note: draft.note,
    };
    const residencyAfterPayment = draft.paymentType === "deposit" && payment.residencyId
      ? tenantResidencies.find((residency) => residency.id === payment.residencyId)
      : undefined;
    try {
      await recordPayment(payment, roomAfterPayment, residencyAfterPayment ? { ...residencyAfterPayment, depositHeld: residencyAfterPayment.depositHeld + draft.amount } : undefined);
      setPaymentRoomId(null);
      setToast(`${formatKes(draft.amount)} recorded for ${draft.roomName}.`);
    } catch (error) {
      setToast(error instanceof Error ? `Payment not saved: ${error.message}` : "Payment could not be saved.");
    }
  }

  function setOpeningBook(draft: SetBookDraft) {
    if (!permissions.canSetBooks || currentUser.role !== "admin" || !setBookRoomId) return;
    const bookSetAt = new Date().toISOString();
    setRooms((current) => current.map((room) => {
      if (room.id !== setBookRoomId) return room;
      const next = { ...room, arrears: 0, bookBalanceDue: draft.amountDue + room.paid, credit: 0, bookNote: draft.note || undefined, bookSetAt, bookSetBy: currentUser.username };
      return { ...next, status: calculatedRoomStatus(next) };
    }));
    const room = rooms.find((item) => item.id === setBookRoomId);
    setSetBookRoomId(null);
    setToast(`Opening book saved for ${room?.number ?? "room"}.`);
  }

  async function exportReport() {
    try {
      const { downloadRoomsReport } = await import("../../reports/roomsReport");
      const filters = [query ? `Search: ${query}` : "", filter !== "all" ? `Status: ${filter}` : ""].filter(Boolean);
      const filename = downloadRoomsReport(selectedProperty, filteredRooms, filters);
      setToast(`${filename} downloaded.`);
    } catch (error) {
      console.error("Room report could not be generated.", error);
      setToast("The room PDF could not be generated. Please try again.");
    }
  }

  return (
    <section className="page feature-page rooms-page">
      <header className="page-header">
        <h1 className="page-title">Rooms &amp; Rent</h1>
        <div className="page-actions"><button className="btn btn-blue btn-sm" onClick={exportReport} type="button"><Icon name="download" />Export PDF</button>{permissions.canManageRooms && <button className="btn btn-primary btn-sm" onClick={() => setIsAddRoomOpen(true)} type="button"><Icon name="plus" />Add Room</button>}</div>
      </header>

      <section className="psum-bar room-summary-bar" aria-label="Room summary">
        <div className="psum-item"><div className="psum-label">Total rooms</div><div className="psum-val">{rooms.length}</div><small>{rooms.length - vacantCount} occupied</small></div>
        <div className="psum-item"><div className="psum-label">Need collection</div><div className="psum-val psum-val--danger">{collectionCount}</div><small>{formatKes(outstanding)} due</small></div>
        <div className="psum-item"><div className="psum-label">Available</div><div className="psum-val psum-val--teal">{vacantCount}</div><small>Ready to let</small></div>
      </section>

      <div className="room-filter-row">
        <input aria-label="Search rooms" className="search-bar" onChange={(event) => setQuery(event.target.value)} placeholder="Search room / tenant..." type="search" value={query} />
        <select aria-label="Filter room status" className="filter-sel" onChange={(event) => setFilter(event.target.value as RoomFilter)} value={filter}><option value="all">All Rooms</option><option value="paid">Paid</option><option value="partial">Partially Paid</option><option value="unpaid">Unpaid</option><option value="credit">Credit</option><option value="vacant">Vacant</option></select>
      </div>

      <div className="cycle-bar"><span>Scheduled monthly reset:</span><strong>{nextResetLabel(selectedProperty.billingResetDay)}</strong></div>

      <section className="room-cards" aria-live="polite">
        {filteredRooms.map((room) => <RoomCard canEdit={permissions.canManageRooms} canManageResidency={permissions.canManageRooms} canRecordPayment={permissions.canRecordPayments} canSetBook={permissions.canSetBooks && currentUser.role === "admin"} key={room.id} onEdit={setEditingRoomId} onHistory={setHistoryRoomId} onMoveIn={setMoveInRoomId} onMoveOut={setMoveOutRoomId} onRecordPayment={setPaymentRoomId} onSetBook={setSetBookRoomId} room={room} />)}
        {!filteredRooms.length && <div className="feature-empty"><Icon name="rooms" size={25} /><strong>No matching rooms</strong><p>Try another room, tenant, or status.</p></div>}
      </section>

      {isAddRoomOpen && permissions.canManageRooms && <AddRoomDialog onClose={() => setIsAddRoomOpen(false)} onSaved={addRoom} rooms={rooms} />}
      {editingRoom && permissions.canManageRooms && <AddRoomDialog onClose={() => setEditingRoomId(null)} onSaved={editRoom} room={editingRoom} rooms={rooms} />}
      {historyRoom && <RoomHistoryDialog onClose={() => setHistoryRoomId(null)} payments={payments} residencies={tenantResidencies.filter((residency) => residency.roomId === historyRoom.id)} room={historyRoom} />}
      {paymentRoomId && permissions.canRecordPayments && <RecordPaymentDialog initialRoomId={paymentRoomId} onClose={() => setPaymentRoomId(null)} onSaved={savePayment} payments={payments} preferredMethod={selectedProperty.preferredPaymentMethod} recordedBy={currentUser.username} receiptPrefix={propertyReceiptPrefix(selectedProperty.name)} rooms={rooms} />}
      {setBookRoom && permissions.canSetBooks && currentUser.role === "admin" && <SetBookDialog onClose={() => setSetBookRoomId(null)} onSaved={setOpeningBook} room={setBookRoom} />}
      {moveInRoom && permissions.canManageRooms && !moveInRoom.tenant && <MoveInTenantDialog onClose={() => setMoveInRoomId(null)} onSaved={moveTenantIn} room={moveInRoom} />}
      {moveOutRoom && permissions.canManageRooms && moveOutRoom.tenant && <MoveOutTenantDialog onClose={() => setMoveOutRoomId(null)} onSaved={moveTenantOut} residency={moveOutResidency} room={moveOutRoom} />}
      {toast && <div aria-live="polite" className="app-toast"><span><Icon name="check" size={16} /></span>{toast}</div>}
    </section>
  );
}
