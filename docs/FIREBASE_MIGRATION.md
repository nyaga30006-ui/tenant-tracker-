# Local test data to Firebase

The current build intentionally uses browser local storage. It must not connect
to or write into the existing live Firebase project during local testing.

## Stable application contract

Feature screens read and update data through `AppDataProvider`, `useProperties`,
and the feature hooks. They do not read local storage directly. A later Firebase
provider must implement the same `AppDataContextValue` operations, including
`provisionProperty(propertyId, roomCount)`.

Property creation uses the shared `createVacantRooms` domain factory. Therefore
the local and Firebase implementations will create identical `Room` records.
User access uses `assignedPropertyIds`, which maps directly to Firebase security
rules and does not depend on local-storage keys.

## Firestore layout

```text
properties/{propertyId}
  rooms/{roomId}
  payments/{paymentId}
  maintenance/{issueId}
  electricityBills/{billId}
  billingResets/{resetId}
  waterMeters/{meterId}
  waterMeterReadings/{readingId}
  waterPurchaseBills/{billId}
  notificationState/{userId}

users/{firebaseUid}
  role
  assignedPropertyIds
  landlordAccess
  disabled
```

The Firebase property repository now creates the property document, writes
generated vacant rooms in safe-sized batches, and marks provisioning complete.
This prevents rooms belonging to different landlords from sharing a top-level
collection and supports properties larger than one Firestore batch.

The active frontend repository is additive/upsert-only. It never deletes a
Firebase document merely because that document is missing from a browser array.
Future deletion and full restore operations require dedicated admin workflows.

## Migration sequence

1. Export a local JSON backup and export the existing live Firebase data.
2. Import both into a separate staging Firebase project or staging namespace.
3. Convert old room, payment, user, and water fields into the domain types under
   `src/types/domain.ts`.
4. Verify totals, room balances, reset history, meter readings, and user property
   assignments against the old app.
5. Run the included Firestore rules against the Emulator Suite. They require the
   user's `assignedPropertyIds` to include the requested property and enforce
   admin, caretaker, and landlord access at the database boundary.
6. Deploy and verify the scheduled reset in staging. It uses one daily job,
   Africa/Nairobi time, per-room transactions, and a monthly idempotency record.
7. Switch the provider from `local` to `firebase` only after the staging audit.

No production migration should overwrite the current Firebase collections. Use
new property-scoped collections first, verify them, and only then switch the
deployed app to the new provider.
