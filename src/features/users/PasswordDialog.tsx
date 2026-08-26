import { useState, type FormEvent } from "react";
import { Modal } from "../../components/ui/Modal";

export function PasswordDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmPassword) return;
    onSaved();
  }

  return <Modal description="Change the signed-in administrator's password." onClose={onClose} title="Change password"><form className="modal-form two-grid" onSubmit={submit}><label className="field field--wide">Current password<input autoFocus onChange={(event) => setCurrentPassword(event.target.value)} required type="password" value={currentPassword} /></label><label className="field field--wide">New password<input minLength={8} onChange={(event) => setNewPassword(event.target.value)} required type="password" value={newPassword} /></label><label className="field field--wide">Confirm new password<input minLength={8} onChange={(event) => setConfirmPassword(event.target.value)} required type="password" value={confirmPassword} /></label>{confirmPassword && newPassword !== confirmPassword && <p className="form-error warning-box field--wide">The new passwords do not match.</p>}<footer className="modal-actions"><button className="button button--secondary btn btn-ghost" onClick={onClose} type="button">Cancel</button><button className="button button--primary btn btn-primary" disabled={newPassword !== confirmPassword} type="submit">Update password</button></footer></form></Modal>;
}
