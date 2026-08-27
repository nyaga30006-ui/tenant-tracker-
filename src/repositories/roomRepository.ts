import { collection, deleteDoc, doc, onSnapshot, setDoc, type DocumentData, type QueryDocumentSnapshot, type Unsubscribe } from "firebase/firestore";
import { getFirebaseDatabase } from "../firebase/app";
import { finiteNumber, firestoreDocument, optionalString } from "../firebase/firestoreData";
import { PROPERTY_SUBCOLLECTIONS, propertyCollectionPath, propertyDocumentPath } from "../firebase/firestorePaths";
import type { Room, RoomStatus } from "../types/domain";

const roomStatuses: RoomStatus[] = ["vacant", "paid", "partial", "unpaid", "credit"];

function statusValue(value: unknown, tenant: string): RoomStatus {
  return roomStatuses.includes(value as RoomStatus) ? value as RoomStatus : tenant ? "unpaid" : "vacant";
}

function fromRoomDocument(snapshot: QueryDocumentSnapshot<DocumentData>): Room {
  const data = snapshot.data();
  const tenant = String(data.tenant ?? "");
  return {
    id: snapshot.id,
    number: String(data.number ?? ""),
    floor: finiteNumber(data.floor),
    tenant,
    rent: finiteNumber(data.rent),
    paid: finiteNumber(data.paid),
    arrears: finiteNumber(data.arrears),
    credit: finiteNumber(data.credit),
    status: statusValue(data.status, tenant),
    activeResidencyId: optionalString(data.activeResidencyId),
    depositPaid: finiteNumber(data.depositPaid),
    depositRequired: finiteNumber(data.depositRequired),
    depositDueEnabled: data.depositDueEnabled === true,
    electricityFee: finiteNumber(data.electricityFee, 2500),
    electricityPaid: finiteNumber(data.electricityPaid),
    electricityDueEnabled: data.electricityDueEnabled === true,
    lastResetMonth: optionalString(data.lastResetMonth),
    bookSetAt: optionalString(data.bookSetAt),
    bookSetBy: optionalString(data.bookSetBy),
    bookNote: optionalString(data.bookNote),
    bookBalanceDue: data.bookBalanceDue === undefined ? undefined : finiteNumber(data.bookBalanceDue),
  };
}

export const roomRepository = {
  subscribe(propertyId: string, onRooms: (rooms: Room[]) => void, onError: (error: Error) => void): Unsubscribe {
    return onSnapshot(collection(getFirebaseDatabase(), propertyCollectionPath(propertyId, PROPERTY_SUBCOLLECTIONS.rooms)), (snapshot) => {
      const rooms = snapshot.docs.map(fromRoomDocument).sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
      onRooms(rooms);
    }, onError);
  },

  save(propertyId: string, room: Room): Promise<void> {
    return setDoc(doc(getFirebaseDatabase(), propertyDocumentPath(propertyId, PROPERTY_SUBCOLLECTIONS.rooms, room.id)), firestoreDocument(room), { merge: false });
  },

  remove(propertyId: string, roomId: string): Promise<void> {
    return deleteDoc(doc(getFirebaseDatabase(), propertyDocumentPath(propertyId, PROPERTY_SUBCOLLECTIONS.rooms, roomId)));
  },
};
