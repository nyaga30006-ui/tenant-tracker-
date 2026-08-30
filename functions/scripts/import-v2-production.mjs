import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
import {createRequire} from "node:module";
import {resolve} from "node:path";

const require = createRequire(import.meta.url);
const {Client} = require("../../node_modules/firebase-tools/lib/apiv2.js");
const {firestoreOrigin} = require("../../node_modules/firebase-tools/lib/api.js");
const firebaseAuth = require("../../node_modules/firebase-tools/lib/auth.js");

const EXPECTED_PROJECT = "myproperty-7a932";
const EXPECTED_PROPERTY = "nyaga-property";
const IMPORT_CONFIRMATION = "IMPORT_NYAGA_V2_WITHOUT_OVERWRITING_V1";
const HELP = `Safely audit, import, or verify the approved MyProperty V2 migration bundle.

Usage:
  node functions/scripts/import-v2-production.mjs --mode audit|import|verify --project ${EXPECTED_PROJECT} --input <bundle.json> --expected-sha256 <sha256> [--confirm ${IMPORT_CONFIRMATION}]

The import is additive and resumable. It refuses conflicting documents, never deletes Version 1 data,
and requires the exact confirmation phrase before making writes.`;

function argument(name, required = true) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1]?.trim() : "";
  if (!value && required) throw new Error(`${name} is required.`);
  return value;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function differencePaths(left, right, prefix = "") {
  if (canonicalJson(left) === canonicalJson(right)) return [];
  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) return [`${prefix || "value"}.length`];
    return left.flatMap((item, index) => differencePaths(item, right[index], `${prefix}[${index}]`)).slice(0, 12);
  }
  if (left && right && typeof left === "object" && typeof right === "object") {
    const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
    return keys.flatMap((key) => differencePaths(left[key], right[key], prefix ? `${prefix}.${key}` : key)).slice(0, 12);
  }
  return [prefix || "value"];
}

function documentId(value, label) {
  const id = typeof value?.id === "string" ? value.id.trim() : "";
  if (!id || id.includes("/")) throw new Error(`${label} has an invalid document ID.`);
  return id;
}

function documentData(value) {
  const {id: _id, ...data} = value;
  return JSON.parse(JSON.stringify(data));
}

function subsetMatches(actual, expected) {
  return Object.entries(expected).every(([key, value]) => canonicalJson(actual?.[key]) === canonicalJson(value));
}

function validateBundle(value, digest) {
  if (!value || typeof value !== "object" || value.source !== "myproperty-v1" || value.version !== 2) {
    throw new Error("The input is not a MyProperty V2 migration bundle.");
  }
  if (!value.report?.canImport || value.report.errors?.length) throw new Error("The migration bundle did not pass reconciliation.");
  if (documentId(value.property, "Property") !== EXPECTED_PROPERTY) throw new Error(`Only ${EXPECTED_PROPERTY} can be imported by this cutover script.`);
  if (!Array.isArray(value.users) || !value.collections || typeof value.collections !== "object") throw new Error("The migration bundle is incomplete.");

  const ids = new Set();
  for (const [index, user] of value.users.entries()) {
    const id = documentId(user, `User ${index + 1}`);
    if (ids.has(`users/${id}`)) throw new Error(`Duplicate user document ID: ${id}`);
    ids.add(`users/${id}`);
  }
  for (const [collectionName, documents] of Object.entries(value.collections)) {
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(collectionName) || !Array.isArray(documents)) throw new Error(`Invalid collection: ${collectionName}`);
    for (const [index, item] of documents.entries()) {
      const id = documentId(item, `${collectionName} item ${index + 1}`);
      const path = `${collectionName}/${id}`;
      if (ids.has(path)) throw new Error(`Duplicate migration document path: ${path}`);
      ids.add(path);
    }
  }

  const reportCounts = value.report.counts ?? {};
  const checks = {
    auditLogs: "v2AuditLogs",
    billingResets: "v2BillingResets",
    electricityBills: "v2ElectricityBills",
    maintenance: "v2Maintenance",
    payments: "v2Payments",
    rooms: "v2Rooms",
    tenantResidencies: "v2Residencies",
  };
  for (const [collectionName, reportName] of Object.entries(checks)) {
    const actual = value.collections[collectionName]?.length ?? 0;
    if (actual !== reportCounts[reportName]) throw new Error(`${collectionName} count does not match the approved report.`);
  }
  if (value.users.length !== reportCounts.v2Users) throw new Error("User count does not match the approved report.");
  return {...value, migrationBundleHash: digest};
}

function firestoreClient(projectId) {
  const account = firebaseAuth.getProjectDefaultAccount(resolve(".")) ?? firebaseAuth.getGlobalDefaultAccount();
  if (!account) throw new Error("Firebase CLI is not signed in.");
  firebaseAuth.setActiveAccount({project: projectId}, account);
  return new Client({auth: true, urlPrefix: firestoreOrigin()});
}

function encodeValue(value) {
  if (value === null) return {nullValue: null};
  if (Array.isArray(value)) return {arrayValue: {values: value.map(encodeValue)}};
  if (typeof value === "boolean") return {booleanValue: value};
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("The migration bundle contains a non-finite number.");
    return Number.isInteger(value) ? {integerValue: String(value)} : {doubleValue: value};
  }
  if (typeof value === "string") return {stringValue: value};
  if (value && typeof value === "object") return {mapValue: {fields: encodeFields(value)}};
  throw new Error(`Unsupported Firestore value: ${typeof value}`);
}

function encodeFields(data) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, encodeValue(value)]));
}

function decodeValue(value) {
  if ("nullValue" in value) return null;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("stringValue" in value) return value.stringValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue.values ?? []).map(decodeValue);
  if ("mapValue" in value) return decodeFields(value.mapValue.fields ?? {});
  throw new Error("Unsupported Firestore response value.");
}

function decodeFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
}

function documentsRoot(projectId) {
  return `/v1/projects/${projectId}/databases/(default)/documents`;
}

function documentName(projectId, path) {
  return `projects/${projectId}/databases/(default)/documents/${path}`;
}

function isNotFound(error) {
  return error?.status === 404 || error?.context?.response?.status === 404 || error?.context?.response?.statusCode === 404;
}

async function getDocument(client, projectId, path) {
  try {
    const response = await client.get(`${documentsRoot(projectId)}/${path}`);
    return {data: decodeFields(response.body.fields), exists: true, updateTime: response.body.updateTime};
  } catch (error) {
    if (isNotFound(error)) return {data: undefined, exists: false, updateTime: undefined};
    throw error;
  }
}

async function listDocuments(client, projectId, path) {
  const documents = [];
  let pageToken = "";
  do {
    const response = await client.get(`${documentsRoot(projectId)}/${path}`, {
      queryParams: {...(pageToken ? {pageToken} : {}), pageSize: 300},
    });
    for (const document of response.body.documents ?? []) {
      documents.push({
        data: decodeFields(document.fields),
        id: String(document.name).split("/").at(-1),
        updateTime: document.updateTime,
      });
    }
    pageToken = response.body.nextPageToken ?? "";
  } while (pageToken);
  return documents;
}

async function inspectTargets(client, projectId, bundle) {
  const propertyId = documentId(bundle.property, "Property");
  const propertyPath = `properties/${propertyId}`;
  const propertyData = documentData(bundle.property);
  delete propertyData.provisioningState;
  const expectedProperty = {...propertyData, migrationBundleHash: bundle.migrationBundleHash};
  const propertySnapshot = await getDocument(client, projectId, propertyPath);
  const operations = [];
  const conflicts = [];

  if (!propertySnapshot.exists) {
    operations.push({data: {...expectedProperty, provisioningState: "importing"}, kind: "create", path: propertyPath});
  } else {
    const actual = propertySnapshot.data;
    const recognised = actual?.migrationBundleHash === bundle.migrationBundleHash
      && ["importing", "ready"].includes(actual?.provisioningState)
      && subsetMatches(actual, expectedProperty);
    if (!recognised) {
      const fields = differencePaths(actual, {...expectedProperty, provisioningState: actual?.provisioningState});
      conflicts.push(`properties/${propertyId} already exists and is not this approved migration (different fields: ${fields.join(", ") || "migration markers"}; hash matches: ${actual?.migrationBundleHash === bundle.migrationBundleHash}; state: ${String(actual?.provisioningState ?? "missing")}).`);
    }
  }

  for (const [index, user] of bundle.users.entries()) {
    const userId = documentId(user, `User ${index + 1}`);
    const expected = documentData(user);
    const path = `users/${userId}`;
    const snapshot = await getDocument(client, projectId, path);
    if (!snapshot.exists) {
      operations.push({data: expected, kind: "create", path});
      continue;
    }
    const actual = snapshot.data;
    if (String(actual?.email ?? "").toLowerCase() !== String(expected.email ?? "").toLowerCase() || actual?.role !== expected.role) {
      conflicts.push(`users/${userId} conflicts with the approved authentication identity or role.`);
      continue;
    }
    if (!subsetMatches(actual, expected)) operations.push({data: expected, kind: "merge", path, updateTime: snapshot.updateTime});
  }

  for (const [collectionName, documents] of Object.entries(bundle.collections)) {
    const collectionPath = `${propertyPath}/${collectionName}`;
    const snapshot = await listDocuments(client, projectId, collectionPath);
    const expectedById = new Map(documents.map((item, index) => [documentId(item, `${collectionName} item ${index + 1}`), documentData(item)]));
    for (const actual of snapshot) {
      const expected = expectedById.get(actual.id);
      if (!expected) conflicts.push(`${collectionName}/${actual.id} is not present in the approved migration bundle.`);
      else if (canonicalJson(actual.data) !== canonicalJson(expected)) conflicts.push(`${collectionName}/${actual.id} differs from the approved migration bundle.`);
      expectedById.delete(actual.id);
    }
    for (const [id, data] of expectedById) operations.push({data, kind: "create", path: `${collectionPath}/${id}`});
  }
  return {conflicts, operations, propertyPath};
}

async function commitOperations(client, projectId, operations) {
  for (let offset = 0; offset < operations.length; offset += 400) {
    const writes = operations.slice(offset, offset + 400).map((operation) => ({
      currentDocument: operation.kind === "create" ? {exists: false} : {updateTime: operation.updateTime},
      update: {fields: encodeFields(operation.data), name: documentName(projectId, operation.path)},
      ...(operation.kind === "merge" ? {updateMask: {fieldPaths: Object.keys(operation.data)}} : {}),
    }));
    await client.post(`${documentsRoot(projectId)}:commit`, {writes}, {skipLog: {body: true}});
  }
}

async function verifyTargets(client, projectId, bundle, requireReady) {
  const {conflicts, operations, propertyPath} = await inspectTargets(client, projectId, bundle);
  if (conflicts.length) throw new Error(`Production verification failed:\n- ${conflicts.join("\n- ")}`);
  if (operations.length) throw new Error(`Production verification found ${operations.length} missing or incomplete documents.`);
  const property = await getDocument(client, projectId, propertyPath);
  if (requireReady && property.data?.provisioningState !== "ready") throw new Error("The migrated property is not marked ready.");
  return 1 + bundle.users.length + Object.values(bundle.collections).reduce((total, documents) => total + documents.length, 0);
}

async function markPropertyReady(client, projectId, propertyPath) {
  const property = await getDocument(client, projectId, propertyPath);
  if (!property.exists || !property.updateTime) throw new Error("The migrated property cannot be marked ready because it is missing.");
  await client.post(`${documentsRoot(projectId)}:commit`, {writes: [{
    currentDocument: {updateTime: property.updateTime},
    update: {fields: encodeFields({provisioningState: "ready"}), name: documentName(projectId, propertyPath)},
    updateMask: {fieldPaths: ["provisioningState"]},
  }]}, {skipLog: {body: true}});
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    process.stdout.write(`${HELP}\n`);
    return;
  }
  if (process.env.FIRESTORE_EMULATOR_HOST) throw new Error("Refusing production migration while FIRESTORE_EMULATOR_HOST is set.");
  const mode = argument("--mode");
  if (!new Set(["audit", "import", "verify"]).has(mode)) throw new Error("--mode must be audit, import, or verify.");
  const projectId = argument("--project");
  if (projectId !== EXPECTED_PROJECT) throw new Error(`This script is locked to ${EXPECTED_PROJECT}.`);
  const input = resolve(argument("--input"));
  const expectedDigest = argument("--expected-sha256").toUpperCase();
  const bytes = await readFile(input);
  const digest = createHash("sha256").update(bytes).digest("hex").toUpperCase();
  if (digest !== expectedDigest) throw new Error(`Bundle SHA256 mismatch. Received ${digest}.`);
  const bundle = validateBundle(JSON.parse(bytes.toString("utf8")), digest);
  const client = firestoreClient(projectId);
  const inspection = await inspectTargets(client, projectId, bundle);
  if (inspection.conflicts.length) throw new Error(`Import blocked:\n- ${inspection.conflicts.join("\n- ")}`);

  const collectionCounts = Object.fromEntries(Object.entries(bundle.collections).map(([name, documents]) => [name, documents.length]));
  if (mode === "audit") {
    process.stdout.write(`${JSON.stringify({bundleHash: digest, collectionCounts, pendingWrites: inspection.operations.length, projectId, propertyId: EXPECTED_PROPERTY, users: bundle.users.length}, null, 2)}\n`);
    return;
  }
  if (mode === "verify") {
    const verified = await verifyTargets(client, projectId, bundle, true);
    process.stdout.write(`${JSON.stringify({
      bundleHash: digest,
      paymentAmountTotal: bundle.report.paymentAmountTotal,
      projectId,
      roomFinancialTotals: bundle.report.roomFinancialTotals,
      status: "verified",
      verifiedDocuments: verified,
    }, null, 2)}\n`);
    return;
  }
  if (argument("--confirm") !== IMPORT_CONFIRMATION) throw new Error(`Import requires --confirm ${IMPORT_CONFIRMATION}`);
  await commitOperations(client, projectId, inspection.operations);
  const verified = await verifyTargets(client, projectId, bundle, false);
  await markPropertyReady(client, projectId, inspection.propertyPath);
  const readyVerified = await verifyTargets(client, projectId, bundle, true);
  if (readyVerified !== verified) throw new Error("Ready-state verification count changed unexpectedly.");
  process.stdout.write(`${JSON.stringify({bundleHash: digest, importedWrites: inspection.operations.length, projectId, status: "ready", verifiedDocuments: verified}, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n\n${HELP}\n`);
  process.exitCode = 1;
});
