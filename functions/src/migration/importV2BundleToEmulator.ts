import {readFile} from "node:fs/promises";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {getApps, initializeApp} from "firebase-admin/app";
import {getFirestore, type DocumentData, type DocumentReference, type Firestore} from "firebase-admin/firestore";
import type {V2MigrationBundle} from "./v1Transform.js";

const HELP = `Import a validated Version 2 migration bundle into the local Firestore emulator.

Usage:
  npm --prefix functions run migration:import:emulator -- --input <v2-bundle.json>

Safety requirements:
  FIRESTORE_EMULATOR_HOST must be localhost or 127.0.0.1.
  GCLOUD_PROJECT must start with demo-.
  The target property and imported user profiles must not already exist.`;

export function assertEmulatorSafety(host: string | undefined, projectId: string | undefined): asserts host is string {
  if (!host || !/^(127\.0\.0\.1|localhost):\d+$/.test(host)) {
    throw new Error("Refusing import: FIRESTORE_EMULATOR_HOST must point to a local emulator.");
  }
  if (!projectId?.startsWith("demo-")) throw new Error("Refusing import: GCLOUD_PROJECT must start with demo-.");
}

function inputPath(args: string[]): string {
  if (args.length !== 2 || args[0] !== "--input" || !args[1]) throw new Error("Exactly one --input path is required.");
  return resolve(args[1]);
}

function migrationBundle(value: unknown): V2MigrationBundle {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("The bundle root must be an object.");
  const candidate = value as Partial<V2MigrationBundle>;
  if (candidate.source !== "myproperty-v1" || candidate.version !== 2 || !candidate.report || !candidate.collections || !candidate.property) {
    throw new Error("This is not a MyProperty Version 2 migration bundle.");
  }
  if (!candidate.report.canImport || candidate.report.errors.length) throw new Error("The migration bundle failed reconciliation and cannot be imported.");
  return candidate as V2MigrationBundle;
}

function documentId(value: Record<string, unknown>, label: string): string {
  const id = typeof value.id === "string" ? value.id.trim() : "";
  if (!id || id.includes("/")) throw new Error(`${label} has an invalid document ID.`);
  return id;
}

function documentData(value: Record<string, unknown>): DocumentData {
  const {id: _id, ...data} = value;
  return JSON.parse(JSON.stringify(data)) as DocumentData;
}

async function assertTargetsAreEmpty(database: Firestore, propertyId: string, users: Record<string, unknown>[]): Promise<void> {
  const property = await database.collection("properties").doc(propertyId).get();
  if (property.exists) throw new Error(`Refusing import: properties/${propertyId} already exists in the emulator.`);
  const userReferences = users.map((user, index) => database.collection("users").doc(documentId(user, `User ${index + 1}`)));
  if (!userReferences.length) return;
  const userSnapshots = await database.getAll(...userReferences);
  const existing = userSnapshots.filter((snapshot) => snapshot.exists).map((snapshot) => snapshot.id);
  if (existing.length) throw new Error(`Refusing import: emulator user profiles already exist: ${existing.join(", ")}`);
}

async function commitWrites(database: Firestore, writes: Array<{data: DocumentData; reference: DocumentReference}>): Promise<void> {
  for (let offset = 0; offset < writes.length; offset += 400) {
    const batch = database.batch();
    for (const write of writes.slice(offset, offset + 400)) batch.create(write.reference, write.data);
    await batch.commit();
  }
}

export async function importBundleToEmulator(bundle: V2MigrationBundle, database: Firestore): Promise<number> {
  const property = bundle.property as Record<string, unknown>;
  const propertyId = documentId(property, "Property");
  const users = bundle.users as Record<string, unknown>[];
  await assertTargetsAreEmpty(database, propertyId, users);

  const propertyReference = database.collection("properties").doc(propertyId);
  const writes: Array<{data: DocumentData; reference: DocumentReference}> = [{
    data: {...documentData(property), provisioningState: "migration-preview"},
    reference: propertyReference,
  }];
  for (const [index, user] of users.entries()) {
    writes.push({data: documentData(user), reference: database.collection("users").doc(documentId(user, `User ${index + 1}`))});
  }
  for (const [collectionName, documents] of Object.entries(bundle.collections)) {
    for (const [index, value] of documents.entries()) {
      const item = value as Record<string, unknown>;
      writes.push({
        data: documentData(item),
        reference: propertyReference.collection(collectionName).doc(documentId(item, `${collectionName} item ${index + 1}`)),
      });
    }
  }
  await commitWrites(database, writes);
  return writes.length;
}

async function runCli(args: string[]): Promise<number> {
  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write(`${HELP}\n`);
    return 0;
  }
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  const projectId = process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT;
  assertEmulatorSafety(host, projectId);
  const bundle = migrationBundle(JSON.parse(await readFile(inputPath(args), "utf8")) as unknown);
  const app = getApps()[0] ?? initializeApp({projectId});
  const count = await importBundleToEmulator(bundle, getFirestore(app));
  process.stdout.write(`Imported ${count} documents into the ${projectId} Firestore emulator at ${host}.\n`);
  return 0;
}

const executablePath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === executablePath) {
  runCli(process.argv.slice(2))
    .then((code) => { process.exitCode = code; })
    .catch((error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n\n${HELP}\n`);
      process.exitCode = 1;
    });
}
