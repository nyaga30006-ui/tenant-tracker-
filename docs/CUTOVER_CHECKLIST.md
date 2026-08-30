# MyProperty V2 cutover checklist

The technical production cutover completed on 30 August 2026. Version 2 is on
the live domain, while the Version 1 Hosting release and top-level Firestore
collections remain intact for the rollback window.

## Current readiness gate

- [x] V2 application and Firebase Functions compile.
- [x] Unit tests cover balances, payments, meters, resets, roles, isolation and reports.
- [x] Strict V2 Security Rules pass emulator tests.
- [x] Temporary V1+V2 transition rules pass emulator tests.
- [x] V1 JSON transformer rejects duplicates, invalid payments and ambiguous electricity balances.
- [x] Emulator-only importer refuses production project IDs and existing target data.
- [x] A transformed V1-style dataset imports and reconciles in an isolated emulator.
- [x] Obtain a complete read-only export of the real V1 data.
- [x] Resolve every warning/error from the real-data reconciliation report.
- [x] Test the real copied dataset in isolated emulators and local desktop/mobile previews.
- [x] Use the isolated emulator rehearsal in place of a separate billable staging project.
- [x] Confirm Blaze billing for Functions and the scheduled monthly-reset job.
- [x] Preserve the V1 Hosting release and confirm the rollback command.
- [x] Administrator gives explicit approval for the production migration window.

## Production cutover record — 30 August 2026

- Project and live site: `myproperty-7a932` / `https://myproperty-7a932.web.app`
- Untouched V1 export SHA-256: `495784EF146C06EFB097EBAC2FFB3C7FE47C16E2A56F634FDFF4434B05F1BB7D`
- Approved V2 bundle SHA-256: `71CB09F9DD9525129622C746ACEFA5A3456FA5EA6EB9A4F4EE4507397A734EA5`
- Final live-vs-export audit: no changed collections; V1 counts remained 83 rooms, 168 payments, 0 maintenance records, 1 electricity bill, 3 users and 715 audit logs.
- Imported and byte-for-byte verified: 1,053 V2 documents.
- Financial reconciliation: KES 780,800 payment total; KES 432,500 room rent; KES 288,100 paid; KES 146,500 arrears; KES 141,700 credit.
- Room 25: KES 2,500 one-time electricity fee remains due with KES 0 paid.
- Previous Firestore ruleset: `projects/myproperty-7a932/rulesets/dec4f1e8-64e4-4b88-be65-1006a59ce381`
- Active transition ruleset: `projects/myproperty-7a932/rulesets/1f1e33bd-e858-41f4-8afe-ef422f78b9c0`
- V1 rollback channel: `v1-rollback-20260829`, expiring 5 September 2026.
- Pre-Hosting Git checkpoint: `ffe988e`.
- Active functions: `createPropertyUser` and `manageTenantResidency` in `africa-south1`; `runDailyBillingResets` in `europe-west1`. All use Node.js 22, 256 MiB and a maximum of one instance.
- The inert failed scheduler shell `runScheduledBillingResets` was audited and deleted after the working Europe scheduler was verified.

Live administrator acceptance passed for Dashboard, Rooms, Payments, Settings,
the three migrated user profiles, Room 25's one-time electricity fee and the
mobile dashboard/navigation. The browser reported no application errors.

Operational sign-off still requires the existing caretaker and landlord to sign
in on their own devices and confirm their assigned-property views. Passwords
were not migrated or changed; Firebase Authentication retained the accounts.
The first real V2 payment should be checked by the administrator before the
write freeze is declared over.

## Read-only V1 export

Use `scripts/export-v1-readonly.js` in the signed-in V1 administrator browser
console. Inspect the file before running it. The script verifies the production
project ID, reads all confirmed V1 collections (including electricity bills),
downloads one JSON file and performs no Firestore writes. Store the downloaded
file in `migration-private/`, which Git ignores.

Never paste a Firebase password, service-account key, ID token or backup JSON
into source code, GitHub, chat messages or screenshots.

## Rehearsal sequence

1. Transform the V1 JSON with `migration:transform`.
2. Review the reconciliation report; `canImport` must be `true`.
3. Import into the isolated `demo-` Firestore emulator.
4. Compare every count and financial total with V1.
5. Manually review occupied rooms, estimated residencies, deposits and any
   older combined electricity balances.
6. Sign in as admin, caretaker, viewing landlord and full-access landlord.
7. Verify property isolation, payment entry/correction, tenant move-in/out,
   maintenance, electricity, water meters, reports and monthly reset.
8. Repeat on a staging preview URL without the live domain.

## Production migration window

1. Announce a short V1 write freeze; users must not record data during the final export.
2. Record the active Firebase Hosting release ID and preserve the prior Git commit.
3. Take the final read-only V1 export and keep it untouched.
4. Rerun the deterministic transform and reconciliation.
5. Deploy `firestore.transition.rules` using `firebase.transition.json`; do not
   deploy strict `firestore.rules` while V1 is still the fallback.
6. Write V2 data only under new `properties/{propertyId}` paths and add the V2
   assignment fields to the existing `users/{uid}` profiles. Do not overwrite
   or delete V1 rooms, payments, maintenance, electricity bills or audit logs.
7. Verify counts and totals directly in production before changing Hosting.
8. Deploy the already-approved V2 build, then verify admin and one account for
   each role on the live domain.
9. Keep V1 data and its Hosting release intact throughout the rollback window.

## Immediate post-switch checks

- Sign-in succeeds with existing Firebase Authentication passwords.
- Admin sees all approved properties; non-admin users see only assigned properties.
- Dashboard totals match the final reconciliation report.
- Room balances, deposits, electricity fees and statuses match the approved review.
- Existing payments and receipt numbers are present and searchable.
- A small authorized test payment can be recorded and corrected.
- Caretaker move-in/out works without changing protected financial terms.
- Reports download correctly on desktop and mobile.
- Scheduled reset configuration exists, but no duplicate reset runs.

## Rollback triggers and action

Rollback immediately for incorrect balances, missing records, property leakage,
failed sign-in for multiple users, unsafe permissions or inability to record a
payment. Restore the previous Firebase Hosting release and continue V1 under the
temporary transition rules. Do not copy partial V2 writes back into V1. Diagnose
against the preserved export, then schedule a new migration attempt.

Before any new V2 payment is entered, the Hosting rollback command is:

```powershell
node .\scripts\firebase-cli.mjs hosting:clone `
  myproperty-7a932:v1-rollback-20260829 `
  myproperty-7a932:live `
  --project myproperty-7a932
```

After V2 writes begin, first freeze entry and preserve/export the new V2 records;
do not blindly roll Hosting back because new records would not exist in V1.

After the acceptance period ends, deploy strict `firestore.rules`, verify V1
top-level paths are denied, and archive rather than delete the V1 export.
