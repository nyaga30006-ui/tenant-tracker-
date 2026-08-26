import { useState, type FormEvent } from "react";
import { Modal } from "../../components/ui/Modal";
import { findDuplicateRoomNumber } from "../../lib/validation";
import type { Room } from "../../types/domain";

export type RoomDraft = Pick<Room, "number" | "floor" | "rent" | "electricityDueEnabled">;

interface AddRoomDialogProps {
  onClose: () => void;
  onSaved: (room: RoomDraft) => void;
  room?: Room;
  rooms: Room[];
}

const emptyRoom: RoomDraft = { number: "", floor: 0, rent: 0, electricityDueEnabled: false };

export function AddRoomDialog({ onClose, onSaved, room, rooms }: AddRoomDialogProps) {
  const [form, setForm] = useState<RoomDraft>(room ? {
    number: room.number,
    floor: room.floor,
    rent: room.rent,
    electricityDueEnabled: room.electricityDueEnabled ?? false,
  } : emptyRoom);
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const number = form.number.trim();
    const duplicate = findDuplicateRoomNumber(rooms, number, room?.id);
    if (duplicate) {
      setError(`${duplicate.number} already exists. Room numbers must be unique in this property.`);
      return;
    }
    if (!number || !Number.isFinite(form.rent) || form.rent <= 0) {
      setError("Enter a room number and a monthly rent above zero.");
      return;
    }
    onSaved({ ...form, number });
  }

  return (
    <Modal description="Set the permanent room details. Tenant occupancy is managed separately with Move tenant in and Move tenant out." onClose={onClose} title={room ? `Edit ${room.number}` : "Add room"}>
      <form className="modal-form" onSubmit={submit}>
        <label className="field">Room number<input autoFocus onChange={(event) => { setForm({ ...form, number: event.target.value }); setError(""); }} placeholder="e.g. Room 24" required value={form.number} /></label>
        <label className="field">Floor<select onChange={(event) => setForm({ ...form, floor: Number(event.target.value) })} value={form.floor}><option value="0">Ground floor</option><option value="1">Floor 1</option><option value="2">Floor 2</option><option value="3">Floor 3</option><option value="4">Floor 4</option></select></label>
        <label className="field field--wide">Monthly rent (KES)<input min="1" onChange={(event) => setForm({ ...form, rent: Number(event.target.value) })} placeholder="6,500" required type="number" value={form.rent || ""} /></label>
        <label className="choice-field field--wide"><input checked={form.electricityDueEnabled ?? false} onChange={(event) => setForm({ ...form, electricityDueEnabled: event.target.checked })} type="checkbox" /><span><strong>Add electricity to monthly due</strong><small>KES 2,500 will be included in this room's monthly charge.</small></span></label>
        {error && <p className="form-error field--wide" role="alert">{error}</p>}
        <footer className="modal-actions"><button className="button button--secondary" onClick={onClose} type="button">Cancel</button><button className="button button--primary" type="submit">{room ? "Save changes" : "Add room"}</button></footer>
      </form>
    </Modal>
  );
}
