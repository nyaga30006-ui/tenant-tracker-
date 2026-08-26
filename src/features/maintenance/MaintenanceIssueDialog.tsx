import { useState, type FormEvent } from "react";
import { Modal } from "../../components/ui/Modal";
import { validateDate } from "../../lib/validation";
import type { MaintenanceIssue, MaintenanceStatus } from "../../types/domain";

export type MaintenanceDraft = Omit<MaintenanceIssue, "id">;

interface MaintenanceIssueDialogProps {
  issue?: MaintenanceIssue;
  onClose: () => void;
  onSaved: (draft: MaintenanceDraft) => void;
}

export function MaintenanceIssueDialog({ issue, onClose, onSaved }: MaintenanceIssueDialogProps) {
  const [draft, setDraft] = useState<MaintenanceDraft>(issue ? { ...issue } : {
    title: "",
    amount: 0,
    status: "reported",
    reportedAt: new Date().toISOString().slice(0, 10),
    category: "maintenance",
    description: "",
    priority: "medium",
    urgency: "soon",
    assignedTo: "",
    reportedBy: "caretaker",
    area: "",
    quantity: 1,
    unitCost: 0,
    location: "",
    assetTag: "",
  });
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const dateError = validateDate(draft.reportedAt, "Reported date", { max: new Date().toISOString().slice(0, 10) });
    if (dateError) {
      setError(dateError);
      return;
    }
    if (!draft.title.trim() || !draft.description?.trim()) {
      setError("Enter both a title and a clear description.");
      return;
    }
    if (!Number.isFinite(Number(draft.amount)) || Number(draft.amount) < 0) {
      setError("Maintenance cost cannot be negative.");
      return;
    }
    onSaved({ ...draft, title: draft.title.trim(), amount: Number(draft.amount), description: draft.description?.trim(), assignedTo: draft.assignedTo?.trim(), area: draft.area?.trim(), location: draft.location?.trim(), assetTag: draft.assetTag?.trim() });
  }

  return (
    <Modal description="Keep the location, cost, responsibility, priority, and progress together in one record." onClose={onClose} title={issue ? "Edit maintenance record" : "Log issue or expense"}>
      <form className="modal-form" onSubmit={submit}>
        <label className="field">Category<select onChange={(event) => setDraft({ ...draft, category: event.target.value as MaintenanceIssue["category"] })} value={draft.category}><option value="maintenance">Maintenance</option><option value="property_equipment">Property equipment</option><option value="technology">Technology</option></select></label>
        <label className="field">Status<select onChange={(event) => setDraft({ ...draft, status: event.target.value as MaintenanceStatus })} value={draft.status}><option value="reported">Reported</option><option value="in-progress">In progress</option><option value="completed">Completed</option></select></label>
        <label className="field field--wide">Title<input autoFocus onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="What needs attention?" required value={draft.title} /></label>
        <label className="field">Room (optional)<input onChange={(event) => setDraft({ ...draft, roomNumber: event.target.value })} placeholder="Room 12" value={draft.roomNumber ?? ""} /></label>
        <label className="field">Area<input onChange={(event) => setDraft({ ...draft, area: event.target.value })} placeholder="Corridor / borehole" value={draft.area ?? ""} /></label>
        <label className="field">Amount (KES)<input min="0" onChange={(event) => setDraft({ ...draft, amount: Number(event.target.value), unitCost: Number(event.target.value) })} required type="number" value={draft.amount || ""} /></label>
        <label className="field">Reported date<input max={new Date().toISOString().slice(0, 10)} onChange={(event) => { setDraft({ ...draft, reportedAt: event.target.value }); setError(""); }} required type="date" value={draft.reportedAt} /></label>
        <label className="field">Priority<select onChange={(event) => setDraft({ ...draft, priority: event.target.value as MaintenanceIssue["priority"] })} value={draft.priority}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
        <label className="field">Urgency<select onChange={(event) => setDraft({ ...draft, urgency: event.target.value as MaintenanceIssue["urgency"] })} value={draft.urgency}><option value="routine">Routine</option><option value="soon">Soon</option><option value="urgent">Urgent</option></select></label>
        <label className="field">Assigned to<input onChange={(event) => setDraft({ ...draft, assignedTo: event.target.value })} placeholder="Caretaker / contractor" value={draft.assignedTo ?? ""} /></label>
        <label className="field">Reported by<input onChange={(event) => setDraft({ ...draft, reportedBy: event.target.value })} value={draft.reportedBy ?? ""} /></label>
        {draft.category !== "maintenance" && <><label className="field">Quantity<input min="1" onChange={(event) => setDraft({ ...draft, quantity: Number(event.target.value) })} type="number" value={draft.quantity ?? 1} /></label><label className="field">Asset tag<input onChange={(event) => setDraft({ ...draft, assetTag: event.target.value })} placeholder="PUMP-01" value={draft.assetTag ?? ""} /></label></>}
        <label className="field field--wide">Description<textarea onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Describe the issue, work, or item in detail" required rows={3} value={draft.description ?? ""} /></label>
        {error && <p className="form-error field--wide" role="alert">{error}</p>}
        <footer className="modal-actions"><button className="button button--secondary btn btn-ghost" onClick={onClose} type="button">Cancel</button><button className="button button--primary btn btn-primary" type="submit">Save record</button></footer>
      </form>
    </Modal>
  );
}
