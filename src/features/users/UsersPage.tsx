import { useEffect, useState, type ChangeEvent } from "react";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { useProperties } from "../../hooks/useProperties";
import { formatDate, formatKes } from "../../lib/format";
import { formatBillingResetDay, nextBillingResetDate, normaliseBillingResetDay } from "../../lib/billingSchedule";
import { normalisePreferredPaymentMethod } from "../../lib/paymentPreferences";
import { useAccess } from "../../app/AccessContext";
import { useAppData } from "../../store/AppDataProvider";
import { userAccountRepository, type CreatedPropertyUser } from "../../repositories/userAccountRepository";
import type { BillingResetRecord, LandlordAccessMode, PaymentMethod } from "../../types/domain";
import { roomRecurringDue } from "../rooms/roomFinance";
import { resetRoomForMonth, roomsReadyForReset } from "../rooms/monthlyReset";
import { UserDialog, type UserDraft } from "./UserDialog";
import { canAddLandlord, canAddUser, MAX_LANDLORDS, remainingLandlordSlots, roleLabel } from "./userPolicy";
import { DeviceNotificationTest } from "../notifications/DeviceNotificationTest";

function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

export function UsersPage() {
  const { properties, selectedProperty, updateProperty } = useProperties();
  const { currentUser, permissions } = useAccess();
  const { billingResetHistory, clearCurrentPropertyData, electricityBills, maintenanceIssues, payments, restoreCurrentPropertyData, rooms, setBillingResetHistory, setRooms, setUsers, storageMode, tenantResidencies, users, waterConfiguration, waterMeterReadings, waterMeters, waterPurchaseBills, waterSales } = useAppData();
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [createdUser, setCreatedUser] = useState<CreatedPropertyUser | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [propertyName, setPropertyName] = useState(selectedProperty.name);
  const [address, setAddress] = useState(selectedProperty.address);
  const [city, setCity] = useState(selectedProperty.city);
  const [billingResetDay, setBillingResetDay] = useState(selectedProperty.billingResetDay);
  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState(selectedProperty.preferredPaymentMethod);
  const [requestedAccessMode, setRequestedAccessMode] = useState<LandlordAccessMode>(currentUser.landlordAccess);
  const [toast, setToast] = useState("");
  const activeLandlords = users.filter((user) => !user.disabled && user.role === "landlord").length;
  const editingUser = users.find((user) => user.id === editingUserId);
  const resetMonth = currentMonthKey();
  const roomsToReset = roomsReadyForReset(rooms, resetMonth);
  const estimatedArrears = roomsToReset.reduce((sum, room) => sum + Math.max(0, roomRecurringDue(room) - room.paid - room.credit), 0);
  const latestReset = [...billingResetHistory].sort((a, b) => b.resetAt.localeCompare(a.resetAt))[0];

  useEffect(() => {
    setPropertyName(selectedProperty.name);
    setAddress(selectedProperty.address);
    setCity(selectedProperty.city);
    setBillingResetDay(selectedProperty.billingResetDay);
    setPreferredPaymentMethod(selectedProperty.preferredPaymentMethod);
  }, [selectedProperty]);

  useEffect(() => {
    setRequestedAccessMode(currentUser.landlordAccessRequest ?? currentUser.landlordAccess);
  }, [currentUser]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function addUser(draft: UserDraft) {
    if (!permissions.canManageUsers) return;
    if (storageMode === "firebase") {
      const created = await userAccountRepository.create(draft);
      setIsUserDialogOpen(false);
      setCreatedUser(created);
      setToast(`${draft.username}'s Firebase account was created.`);
      return;
    }
    if (!canAddUser(users) || (draft.role === "landlord" && !canAddLandlord(users))) {
      setToast("The selected account limit has been reached.");
      return;
    }
    setUsers((current) => [...current, { ...draft, id: crypto.randomUUID(), disabled: false }]);
    setIsUserDialogOpen(false);
    setToast(`${draft.username}'s local profile was added.`);
  }

  function editUserAccess(draft: UserDraft) {
    if (!permissions.canManageUsers || !editingUser) return;
    const addsLandlord = editingUser.role !== "landlord" && draft.role === "landlord";
    if (addsLandlord && !canAddLandlord(users)) {
      setToast("The landlord account limit has been reached.");
      return;
    }
    setUsers((current) => current.map((user) => user.id === editingUser.id ? { ...user, ...draft, landlordAccessRequest: undefined } : user));
    setEditingUserId(null);
    setToast(`${draft.username}'s property access was updated.`);
  }

  function downloadBackup() {
    const backup = JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), property: selectedProperty, users, rooms, tenantResidencies, payments, maintenanceIssues, electricityBills, billingResetHistory, waterConfiguration, waterMeters, waterMeterReadings, waterPurchaseBills, waterSales }, null, 2);
    const url = URL.createObjectURL(new Blob([backup], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `myproperty-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setToast("Backup downloaded.");
  }

  async function restoreBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      restoreCurrentPropertyData(JSON.parse(await file.text()));
      setToast(`Backup restored to ${selectedProperty.name}.`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "The backup could not be restored.");
    } finally {
      event.target.value = "";
    }
  }

  function clearPropertyData() {
    if (!permissions.canManageUsers) return;
    if (!window.confirm(`Clear all rooms, payments, maintenance, electricity, water, and reset records for ${selectedProperty.name}?`)) return;
    clearCurrentPropertyData();
    setToast(`${selectedProperty.name} data was cleared.`);
  }

  async function saveProperty() {
    if (!permissions.canManageUsers) return;
    try {
      await updateProperty({ ...selectedProperty, name: propertyName.trim(), address: address.trim(), city: city.trim(), billingResetDay: normaliseBillingResetDay(billingResetDay), preferredPaymentMethod: normalisePreferredPaymentMethod(preferredPaymentMethod) });
      setToast(storageMode === "local" ? "Property information saved locally." : "Property information saved to Firebase.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Property information could not be saved.");
    }
  }

  function runManualReset() {
    if (!permissions.canResetMonths) return;
    if (storageMode === "firebase") {
      setToast("Firebase resets will run through the atomic scheduled backend, not from the browser.");
      return;
    }
    if (!roomsToReset.length) return;
    const resetAt = new Date().toISOString();
    const eligibleIds = new Set(roomsToReset.map((room) => room.id));
    setRooms((current) => current.map((room) => eligibleIds.has(room.id) ? resetRoomForMonth(room, resetMonth) : room));
    const record: BillingResetRecord = { arrearsCarried: estimatedArrears, id: crypto.randomUUID(), kind: "manual", month: resetMonth, recordedBy: "Property Admin", resetAt, roomsProcessed: roomsToReset.length };
    setBillingResetHistory((current) => [record, ...current]);
    setIsResetOpen(false);
    setToast(`${roomsToReset.length} rooms moved into ${new Date(`${resetMonth}-01T00:00:00`).toLocaleDateString("en-KE", { month: "long", year: "numeric" })}.`);
  }

  function requestAccessChange() {
    if (currentUser.role !== "landlord" || requestedAccessMode === currentUser.landlordAccess) return;
    setUsers((current) => current.map((user) => user.id === currentUser.id ? { ...user, landlordAccessRequest: requestedAccessMode } : user));
    setToast("Your access request was sent to the administrator.");
  }

  function reviewAccessRequest(userId: string, approve: boolean) {
    if (!permissions.canManageUsers) return;
    setUsers((current) => current.map((user) => {
      if (user.id !== userId || !user.landlordAccessRequest) return user;
      return { ...user, landlordAccess: approve ? user.landlordAccessRequest : user.landlordAccess, landlordAccessRequest: undefined };
    }));
    setToast(approve ? "Landlord access change approved." : "Landlord access change declined.");
  }

  if (currentUser.role === "landlord") {
    const assignedPropertyNames = properties.filter((property) => currentUser.assignedPropertyIds.includes(property.id)).map((property) => property.name);
    return (
      <section className="feature-page legacy-feature-page settings-page landlord-access-page">
        <header className="legacy-page-header"><div><h1>Access Preference</h1><p>Your access applies only to properties assigned by the administrator.</p></div></header>
        <section className="settings-section landlord-access-card">
          <header><div><span className="settings-icon"><Icon name="users" /></span><div><h2>Property access</h2><p>Choose the access level you prefer. Every change requires administrator approval.</p></div></div><span className={`access-mode-badge access-mode-badge--${currentUser.landlordAccess}`}>{currentUser.landlordAccess === "full" ? "Full property access" : "View only"}</span></header>
          <div className="landlord-access-content">
            <div className="assigned-property-summary info-box"><small>Assigned properties</small><strong>{assignedPropertyNames.join(", ") || "No property assigned"}</strong></div>
            <label className="field">Requested access<select onChange={(event) => setRequestedAccessMode(event.target.value as LandlordAccessMode)} value={requestedAccessMode}><option value="view">View only</option><option value="full">Full property access</option></select></label>
            <div className="access-mode-comparison two-grid"><article className="info-box"><strong>View only</strong><p>See the dashboard, rooms, payments, water, maintenance, and bills. No records can be changed.</p></article><article className="info-box"><strong>Full property access</strong><p>Manage operational records for assigned properties after admin approval. User accounts, integrations, and the wider portfolio remain admin-only.</p></article></div>
            {currentUser.landlordAccessRequest && <div className="access-request-pending warning-box"><strong>Waiting for admin approval</strong><span>Requested: {currentUser.landlordAccessRequest === "full" ? "Full property access" : "View only"}. Current permissions remain unchanged.</span></div>}
            <button className="legacy-primary-button btn btn-primary" disabled={Boolean(currentUser.landlordAccessRequest) || requestedAccessMode === currentUser.landlordAccess} onClick={requestAccessChange} type="button">Request administrator approval</button>
          </div>
        </section>
        {toast && <div aria-live="polite" className="app-toast"><span><Icon name="check" size={16} /></span>{toast}</div>}
      </section>
    );
  }

  return (
    <section className="feature-page legacy-feature-page settings-page">
      <header className="legacy-page-header"><div><h1>Settings</h1><p>{storageMode === "local" ? "Local test data is saved in this browser." : ""}</p></div><button className="legacy-primary-button legacy-primary-button--plain btn btn-ghost" disabled title="Password changes become available after Firebase Authentication is connected." type="button">Password requires Firebase</button></header>

      <section className="settings-section">
        <header><div><span className="settings-icon"><Icon name="users" /></span><div><h2>Property Teams</h2><p>Create landlords and caretakers, then assign exactly which properties each person can access.</p></div></div><button className="legacy-primary-button btn btn-primary" disabled={!canAddUser(users)} onClick={() => setIsUserDialogOpen(true)} type="button"><Icon name="plus" />Add User</button></header>
        <div className="landlord-capacity"><div><small>Landlord capacity</small><strong>{activeLandlords} of {MAX_LANDLORDS}</strong><span>{remainingLandlordSlots(users)} landlord slots available</span></div><div className="capacity-bar"><span style={{ width: `${activeLandlords / MAX_LANDLORDS * 100}%` }} /></div></div>
        <div className="settings-user-list">
          {users.map((user) => {
            const assigned = user.role === "admin" ? "All properties" : properties.filter((property) => user.assignedPropertyIds.includes(property.id)).map((property) => property.name).join(", ") || "No property assigned";
            return <article className="user-row" key={user.id}><span className="settings-user-avatar">{user.username.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div className="settings-user-meta"><strong>{user.username}</strong><small>{user.email}</small><small>Properties: {assigned}</small>{user.role === "landlord" && <small>Access: {user.landlordAccess === "full" ? "Full property access" : "View only"}</small>}</div><span className={`legacy-tag legacy-tag--${user.disabled ? "former" : "current"}`}>{roleLabel(user.role)}</span><div className="settings-user-actions">{user.landlordAccessRequest && <div className="admin-access-request warning-box"><span>Requests {user.landlordAccessRequest === "full" ? "full access" : "view only"}</span><button onClick={() => reviewAccessRequest(user.id, true)} type="button">Approve</button><button onClick={() => reviewAccessRequest(user.id, false)} type="button">Decline</button></div>}{user.role !== "admin" && <><button className="legacy-action-button btn btn-ghost btn-sm" onClick={() => setEditingUserId(user.id)} type="button">Edit Access</button><button className="legacy-action-button btn btn-ghost btn-sm" onClick={() => setUsers((current) => current.map((item) => item.id === user.id ? { ...item, disabled: !item.disabled } : item))} type="button">{user.disabled ? "Enable" : "Disable"}</button></>}</div></article>;
          })}
        </div>
      </section>

      <section className="settings-grid two-grid">
        <article className="settings-section settings-section--compact">
          <header><div><span className="settings-icon"><Icon name="calendar" /></span><div><h2>Monthly Billing</h2><p>Confirmed reset and arrears control for the selected property.</p></div></div></header>
          <dl className="settings-definition-list"><div><dt>Planned schedule</dt><dd>{formatBillingResetDay(selectedProperty.billingResetDay)} of every month</dd></div><div><dt>Next scheduled date</dt><dd>{formatDate(nextBillingResetDate(selectedProperty.billingResetDay).toISOString())}</dd></div><div><dt>Last completed reset</dt><dd>{latestReset ? formatDate(latestReset.resetAt) : "No local reset recorded"}</dd></div><div><dt>Ready this month</dt><dd>{roomsToReset.length} occupied rooms</dd></div></dl>
          <button className="legacy-action-button legacy-action-button--gold btn btn-orange btn-sm" disabled={storageMode === "firebase" || !roomsToReset.length} onClick={() => setIsResetOpen(true)} title={storageMode === "firebase" ? "Firebase resets are executed by the scheduled backend." : undefined} type="button">{storageMode === "firebase" ? "Scheduled Backend Reset" : roomsToReset.length ? "Run Manual Reset" : "Current Month Already Reset"}</button>
        </article>

        <DeviceNotificationTest />

        <article className="settings-section settings-section--compact">
          <header><div><span className="settings-icon"><Icon name="settings" /></span><div><h2>Backups & Data</h2><p>Download and restore operational data.</p></div></div></header>
          <div className="settings-button-stack"><button className="legacy-action-button legacy-action-button--green btn btn-green btn-sm" onClick={downloadBackup} type="button">Download Backup</button><label aria-disabled={storageMode === "firebase"} className="legacy-action-button btn btn-ghost btn-sm">Restore Backup<input accept="application/json" className="visually-hidden" disabled={storageMode === "firebase"} onChange={restoreBackup} type="file" /></label><button className="legacy-action-button settings-danger-button btn btn-danger btn-sm" disabled={storageMode === "firebase"} onClick={clearPropertyData} type="button">Clear Property Data</button></div>
        </article>
      </section>

      <section className="settings-section">
        <header><div><span className="settings-icon"><Icon name="building" /></span><div><h2>Property Information</h2><p>Details used in reports, receipts, and exports.</p></div></div></header>
        <form className="property-settings-form two-grid" onSubmit={(event) => { event.preventDefault(); void saveProperty(); }}><label className="field">Property name<input onChange={(event) => setPropertyName(event.target.value)} required value={propertyName} /></label><label className="field">Address<input onChange={(event) => setAddress(event.target.value)} required value={address} /></label><label className="field">Town / city<input onChange={(event) => setCity(event.target.value)} required value={city} /></label><label className="field">Monthly reset day<input max="28" min="1" onChange={(event) => setBillingResetDay(Number(event.target.value))} required type="number" value={billingResetDay} /></label><label className="field">Primary payment<select onChange={(event) => setPreferredPaymentMethod(event.target.value as PaymentMethod)} value={preferredPaymentMethod}><option value="mpesa">M-Pesa</option><option value="bank">KCB Bank</option><option value="cash">Cash</option></select></label><button className="legacy-primary-button btn btn-primary" type="submit">Save Property</button></form>
      </section>

      {isUserDialogOpen && <UserDialog onClose={() => setIsUserDialogOpen(false)} onSaved={addUser} />}
      {createdUser && <Modal description="The account is ready. Send this private setup link only to the new user so they can choose their password." onClose={() => setCreatedUser(null)} title="Firebase account created"><div className="modal-form"><label className="field">Account email<input readOnly value={createdUser.email} /></label><label className="field">Private password setup link<textarea readOnly rows={5} value={createdUser.passwordSetupLink} /></label><p className="info-box">For security, this link is shown here only after account creation. Do not post it publicly.</p><footer className="modal-actions"><button className="button button--secondary btn btn-ghost" onClick={() => setCreatedUser(null)} type="button">Done</button><button className="button button--primary btn btn-primary" onClick={() => { void navigator.clipboard.writeText(createdUser.passwordSetupLink); setToast("Password setup link copied."); }} type="button">Copy setup link</button></footer></div></Modal>}
      {editingUser && <UserDialog onClose={() => setEditingUserId(null)} onSaved={editUserAccess} user={editingUser} />}
      {isResetOpen && <Modal description="This action carries unpaid recurring charges into arrears, applies any credit, and resets paid-this-month to zero. It cannot be run twice for the same room and month." onClose={() => setIsResetOpen(false)} title={`Reset ${selectedProperty.name}?`}><div className="monthly-reset-preview info-box two-grid"><div><small>Rooms processed</small><strong>{roomsToReset.length}</strong></div><div><small>Estimated arrears</small><strong>{formatKes(estimatedArrears)}</strong></div><p className="warning-box">Download a backup first if this is real operational data.</p></div><footer className="modal-actions"><button className="button button--secondary btn btn-ghost" onClick={() => setIsResetOpen(false)} type="button">Cancel</button><button className="button button--danger btn btn-danger" onClick={runManualReset} type="button">Confirm Monthly Reset</button></footer></Modal>}
      {toast && <div aria-live="polite" className="app-toast"><span><Icon name="check" size={16} /></span>{toast}</div>}
    </section>
  );
}
