import { writeBatch, type DocumentData, type DocumentReference, type Firestore } from "firebase/firestore";

const MAX_SAFE_BATCH_WRITES = 450;

export interface BatchedSet {
  data: DocumentData;
  reference: DocumentReference<DocumentData>;
}

export async function commitSetsInChunks(database: Firestore, writes: BatchedSet[]): Promise<void> {
  for (let start = 0; start < writes.length; start += MAX_SAFE_BATCH_WRITES) {
    const batch = writeBatch(database);
    for (const write of writes.slice(start, start + MAX_SAFE_BATCH_WRITES)) {
      batch.set(write.reference, write.data);
    }
    await batch.commit();
  }
}
