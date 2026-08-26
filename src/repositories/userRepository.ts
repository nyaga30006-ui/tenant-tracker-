import { collection, deleteField, doc, onSnapshot, setDoc, type DocumentData, type DocumentSnapshot, type QueryDocumentSnapshot, type Unsubscribe } from "firebase/firestore";
import { getFirebaseDatabase } from "../firebase/app";
import { firestoreDocument } from "../firebase/firestoreData";
import { FIRESTORE_COLLECTIONS, userPath } from "../firebase/firestorePaths";
import type { AppUser, UserRole } from "../types/domain";

const userRoles: UserRole[] = ["admin", "landlord", "caretaker"];

function fromUserDocument(snapshot: DocumentSnapshot<DocumentData> | QueryDocumentSnapshot<DocumentData>): AppUser {
  const data = snapshot.data() ?? {};
  return {
    id: snapshot.id,
    username: String(data.username ?? data.name ?? data.email ?? "User"),
    email: String(data.email ?? ""),
    role: userRoles.includes(data.role as UserRole) ? data.role as UserRole : "caretaker",
    disabled: data.disabled === true,
    assignedPropertyIds: Array.isArray(data.assignedPropertyIds) ? data.assignedPropertyIds.map(String) : [],
    landlordAccess: data.landlordAccess === "full" ? "full" : "view",
    landlordAccessRequest: data.landlordAccessRequest === "full" || data.landlordAccessRequest === "view" ? data.landlordAccessRequest : undefined,
  };
}

export const userRepository = {
  subscribeAll(onUsers: (users: AppUser[]) => void, onError: (error: Error) => void): Unsubscribe {
    return onSnapshot(collection(getFirebaseDatabase(), FIRESTORE_COLLECTIONS.users), (snapshot) => {
      onUsers(snapshot.docs.map(fromUserDocument).sort((a, b) => a.username.localeCompare(b.username)));
    }, onError);
  },

  subscribeCurrent(userId: string, onUser: (user: AppUser | null) => void, onError: (error: Error) => void): Unsubscribe {
    return onSnapshot(doc(getFirebaseDatabase(), userPath(userId)), (snapshot) => {
      onUser(snapshot.exists() ? fromUserDocument(snapshot) : null);
    }, onError);
  },

  save(user: AppUser): Promise<void> {
    const { landlordAccessRequest, ...storedUser } = user;
    return setDoc(doc(getFirebaseDatabase(), userPath(user.id)), {
      ...firestoreDocument(storedUser),
      landlordAccessRequest: landlordAccessRequest ?? deleteField(),
    }, { merge: true });
  },
};
