# MyProperty V2 cutover checklist

The live domain and production Firebase data remain unchanged until every
pre-cutover box is complete and the administrator explicitly approves the
switch. The GitHub checkpoint is not a deployment.

## Current readiness gate

- [x] V2 application and Firebase Functions compile.
- [x] Unit tests cover balances, payments, meters, resets, roles, isolation and reports.
- [x] Strict V2 Security Rules pass emulator tests.
- [x] Temporary V1+V2 transition rules pass emulator tests.
- [x] V1 JSON transformer rejects duplicates, invalid payments and ambiguous electricity balances.
- [x] Emulator-only importer refuses production project IDs and existing target data.
- [x] A transformed V1-style dataset imports and reconciles in an isolated emulator.
- [ ] Obtain a complete read-only export of the real V1 data.
- [ ] Resolve every warning/error from the real-data reconciliation report.
- [ ] Test the real copied dataset in the emulator on desktop and mobile.
- [ ] Test in a separate Firebase staging project and preview URL.
- [ ] Confirm Firebase billing for Functions and the scheduled monthly-reset job.
- [ ] Record the current Hosting release and confirm the rollback command.
- [ ] Administrator gives explicit approval for the production migration window.

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

After the acceptance period ends, deploy strict `firestore.rules`, verify V1
top-level paths are denied, and archive rather than delete the V1 export.
