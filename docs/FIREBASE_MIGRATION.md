# Version 1 to Version 2 Firebase migration

Version 2 currently connects only to the local Firebase Emulator Suite. The
live domain and live Firebase project must remain unchanged until a copied-data
migration has passed reconciliation and the administrator approves cutover.

## Confirmed Version 1 layout

The local copy of Version 1 (`nyaga_property (9).html`) shows a single-property
Firestore model:

```text
settings/app
  propname
  cycleHistory

rooms/{roomId}
payments/{paymentId}
maintenance/{issueId}
electricityBills/{billId}
users/{firebaseUid}
auditLogs/{auditId}
```

Version 1 uses the same Firebase Authentication UID as the matching `users`
document. Password hashes are held by Firebase Authentication and are not
exported, copied, or reset by this migration.

## Stable application contract

Feature screens read and update data through `AppDataProvider`, `useProperties`,
and feature hooks. Local and Firebase providers implement the same application
contract, which lets copied data be tested in the emulator before cutover.

Property creation uses the shared `createVacantRooms` domain factory. Therefore
the local and Firebase implementations will create identical `Room` records.
User access uses `assignedPropertyIds`, which maps directly to Firebase security
rules and does not depend on local-storage keys.

## Firestore layout

```text
properties/{propertyId}
  rooms/{roomId}
  payments/{paymentId}
  paymentReferences/{normalisedReference}
  tenantResidencies/{residencyId}
  maintenance/{issueId}
  electricityBills/{billId}
  billingResets/{resetId}
  waterMeters/{meterId}
  waterMeterReadings/{readingId}
  waterPurchaseBills/{billId}
  notificationState/{userId}
  auditLogs/{auditId}              # preserved migration archive; not yet shown in UI

properties/{propertyId}/settings/water

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

## Field transformation

| Version 1 | Version 2 |
| --- | --- |
| `settings/app.propname` | `properties/{propertyId}.name` |
| `settings/app.cycleHistory[]` | `properties/{propertyId}/billingResets/*` |
| top-level `rooms/*` | `properties/{propertyId}/rooms/*` |
| `rooms.paid/arrears/credit` | Preserved exactly, then reconciled against payment totals |
| `rooms.deposit*` and `rooms.electricity*` | Preserved when present; ambiguous combined V1 electricity balances block import for administrator review |
| current non-empty `rooms.tenant` | Active `tenantResidencies` record linked by `activeResidencyId` |
| top-level `payments/*` | Property-scoped payments with provider, status, type, residency, and ISO date fields |
| `payments.refNumber/mpesaCode` | `reference` plus a unique `paymentReferences` reservation |
| top-level `maintenance/*` | Property-scoped maintenance records with normalized category and dates |
| top-level `electricityBills/*` | Property-scoped electricity bills with area, month, amount, status and due date preserved |
| top-level `users/*` | Existing UID retained; add `assignedPropertyIds` and `landlordAccess` |
| top-level `auditLogs/*` | Property-scoped audit archive retained for traceability |

Version 1 does not reliably store tenant move-in dates, water meters, residency
boundaries, or a separate electricity-paid balance for older room records. The
converter must not invent confirmed historical facts. Missing residency dates
are marked as estimated imports. Current deposit and electricity fields are
preserved when available; ambiguous combined electricity balances block import
until an administrator reviews and allocates them.

## Migration sequence

1. Keep the GitHub checkpoint and create a timestamped Firebase export before
   any migration write.
2. Export Version 1 collections read-only with `scripts/export-v1-readonly.js`
   and preserve the untouched export.
3. Transform the export locally into a deterministic Version 2 import bundle.
4. Import the bundle into the Firebase emulator first—not production.
5. Reconcile document counts, rent totals, payments, room balances, receipt
   numbers, references, reset history, and user assignments against Version 1.
6. Review every occupied room whose residency/deposit information was missing.
7. Run the included Firestore rules against the Emulator Suite. They require the
   user's `assignedPropertyIds` to include the requested property and enforce
   admin, caretaker, and landlord access at the database boundary.
8. Deploy and verify the scheduled reset in staging. It uses one daily job,
   Africa/Nairobi time, per-room transactions, and a monthly idempotency record.
9. Deploy Version 2 to a preview URL and complete mobile/desktop acceptance tests.
10. Freeze Version 1 writes briefly, take a final export, rerun the deterministic
    migration, reconcile again, and only then switch the domain.

## Required reconciliation report

The migration is not approved unless the report shows:

- identical source and imported room counts;
- identical payment counts and payment amount totals;
- no duplicate receipt numbers or non-empty payment references;
- every active room linked to exactly one active residency;
- every non-admin user assigned only to approved properties;
- room rent, paid, arrears, and credit totals matching Version 1;
- all source document IDs recorded or explicitly listed as skipped with a reason.

## Rollback

Version 1 remains deployed and its pre-cutover export remains untouched. If any
post-switch check fails, restore the previous Hosting release/domain target and
continue using Version 1. Do not reverse-migrate partially written Version 2
documents into the Version 1 collections.

No production migration should overwrite the current Firebase collections. Use
new property-scoped collections first, verify them, and only then switch the
deployed app to the new provider.

## Security rules during cutover

Do **not** deploy `firestore.rules` while Version 1 is still in service: those
strict V2 rules intentionally deny all top-level V1 data paths. During the
short migration and rollback window, use `firestore.transition.rules`. It keeps
the existing V1 permissions for top-level collections while also enforcing V2
property isolation. Its automated tests cover both behaviours.

After V2 acceptance and the rollback window, deploy the strict
`firestore.rules` and verify that top-level V1 paths are denied. The transition
rules deliberately retain V1's broader ability for active users to list user
profiles, so they must be temporary.

## Offline converter

The converter accepts either a local JSON object containing the collections or
the current Version 1 **Export Backup** format, where collections are nested in
`data`. It does not initialize the Firebase SDK and cannot read or write a
Firebase project:

```json
{
  "settings": {},
  "rooms": [],
  "payments": [],
  "maintenance": [],
  "electricityBills": [],
  "users": [],
  "auditLogs": []
}
```

Run it from the repository root after creating that read-only export:

```powershell
npm --prefix functions run migration:transform -- `
  --input .\migration-private\v1-export.json `
  --output .\migration-private\v2-preview.json `
  --property-id nyaga-property `
  --property-name "Nyaga Property" `
  --migration-date 2026-08-27 `
  --address "Property address" `
  --city "Kitengela" `
  --billing-reset-day 2 `
  --preferred-payment-method bank `
  --duplicate-receipt-strategy block
```

The command writes a separate `v2-preview.report.json`. If validation finds a
duplicate room ID, payment ID, receipt number, or non-empty payment reference,
it writes the report, exits with an error, and does not create the Version 2
bundle. Keep real exports under `migration-private/`; that directory is ignored
by Git and must never be committed.

Keep the default duplicate-receipt strategy as `block` while investigating a
collision. After confirming the records are separate genuine payments, the
`suffix` strategy retains the first receipt, gives later occurrences a
deterministic `-MIG2` suffix, and preserves each original value as
`legacyReceiptNo`. `--property-name` explicitly corrects a stale Version 1
property setting without changing the untouched source export.

After the report passes, import the bundle only through `emulators:exec`:

```powershell
node .\scripts\firebase-cli.mjs emulators:exec `
  --project demo-myproperty `
  --only firestore `
  "npm --prefix functions run migration:import:emulator -- --input .\migration-private\v2-preview.json"
```

The importer has three independent safety locks: it requires a local emulator
host, requires a `demo-` project ID, and refuses to overwrite an existing
property or user profile. After importing, it reads every property, user and
subcollection document back from the emulator and compares the content with the
preview bundle. It contains no production-import mode.
