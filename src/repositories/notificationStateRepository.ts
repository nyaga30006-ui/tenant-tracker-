import { doc, onSnapshot, setDoc, type Unsubscribe } from "firebase/firestore";
import { getFirebaseDatabase } from "../firebase/app";
import { firestoreDocument } from "../firebase/firestoreData";
import { PROPERTY_SUBCOLLECTIONS, propertyDocumentPath } from "../firebase/firestorePaths";

function reference(propertyId: string, userId: string) {
  return doc(getFirebaseDatabase(), propertyDocumentPath(propertyId, PROPERTY_SUBCOLLECTIONS.notificationState, userId));
}

export const notificationStateRepository = {
  subscribe(propertyId: string, userId: string, onIds: (ids: string[]) => void, onError: (error: Error) => void): Unsubscribe {
    return onSnapshot(reference(propertyId, userId), (snapshot) => {
      const ids = snapshot.data()?.readNotificationIds;
      onIds(Array.isArray(ids) ? ids.map(String).slice(-100) : []);
    }, onError);
  },

  save(propertyId: string, userId: string, readNotificationIds: string[]): Promise<void> {
    return setDoc(reference(propertyId, userId), firestoreDocument({ readNotificationIds: [...new Set(readNotificationIds)].slice(-100) }), { merge: true });
  },
};

