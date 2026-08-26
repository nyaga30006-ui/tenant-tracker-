import { useState, type FormEvent } from "react";
import { Modal } from "../../components/ui/Modal";
import { useProperties } from "../../hooks/useProperties";
import type { AppUser, UserRole } from "../../types/domain";

export type UserDraft = Pick<AppUser, "assignedPropertyIds" | "email" | "landlordAccess" | "role" | "username">;

interface UserDialogProps {
  onClose: () => void;
  onSaved: (user: UserDraft) => void;
  user?: AppUser;
}

export function UserDialog({ onClose, onSaved, user }: UserDialogProps) {
  const { properties, selectedProperty } = useProperties();
  const orderedProperties = [selectedProperty, ...properties.filter((property) => property.id !== selectedProperty.id)];
  const [draft, setDraft] = useState<UserDraft>(user ? {
    assignedPropertyIds: [...user.assignedPropertyIds],
    email: user.email,
    landlordAccess: user.landlordAccess,
    role: user.role,
    username: user.username,
  } : { assignedPropertyIds: [selectedProperty.id], username: "", email: "", landlordAccess: "view", role: "landlord" });

  function changeRole(role: UserRole) {
    setDraft({ ...draft, role, landlordAccess: role === "landlord" && user?.role === "landlord" ? user.landlordAccess : "view" });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSaved({ ...draft, username: draft.username.trim(), email: draft.email.trim().toLowerCase() });
  }

  return (
    <Modal description={user ? "Change this person's role or the properties they can access. Firebase will use the same assignments when real authentication is connected." : `Create a local test account. ${selectedProperty.name} is selected by default, and you can assign one or more properties.`} onClose={onClose} title={user ? "Edit property access" : "Add user account"}>
      <form className="modal-form two-grid" onSubmit={submit}>
        <label className="field field--wide">Full name<input autoFocus onChange={(event) => setDraft({ ...draft, username: event.target.value })} required value={draft.username} /></label>
        <label className="field field--wide">Email address<input onChange={(event) => setDraft({ ...draft, email: event.target.value })} required type="email" value={draft.email} /></label>
        <label className="field field--wide">Role<select onChange={(event) => changeRole(event.target.value as UserRole)} value={draft.role}><option value="landlord">Landlord</option><option value="caretaker">Caretaker</option></select></label>
        <fieldset className="field field--wide property-assignment-field info-box"><legend>Property access — choose one or more</legend>{orderedProperties.map((property) => <label className="choice-field user-row" key={property.id}><input checked={draft.assignedPropertyIds.includes(property.id)} onChange={(event) => setDraft({ ...draft, assignedPropertyIds: event.target.checked ? [...new Set([...draft.assignedPropertyIds, property.id])] : draft.assignedPropertyIds.filter((id) => id !== property.id) })} type="checkbox" /><span><strong>{property.name}{property.id === selectedProperty.id ? " · Current property" : ""}</strong><small>{property.city} · {property.units} rooms</small></span></label>)}</fieldset>
        <aside className="form-note info-box field--wide">{draft.role === "landlord" ? "Landlords start with view-only access. They can request full access, but changes remain locked until an administrator approves them." : "Caretakers can record rent, water, maintenance, and bills only for their assigned properties. They cannot use the dashboard, add rooms, reset months, or manage users."}</aside>
        <footer className="modal-actions"><button className="button button--secondary btn btn-ghost" onClick={onClose} type="button">Cancel</button><button className="button button--primary btn btn-primary" disabled={!draft.assignedPropertyIds.length} type="submit">{user ? "Save access" : "Create account"}</button></footer>
      </form>
    </Modal>
  );
}
