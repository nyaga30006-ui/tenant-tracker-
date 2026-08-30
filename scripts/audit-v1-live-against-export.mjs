import {readFile} from "node:fs/promises";
import {createRequire} from "node:module";
import {resolve} from "node:path";

const require = createRequire(import.meta.url);
const {Client} = require("../node_modules/firebase-tools/lib/apiv2.js");
const {firestoreOrigin} = require("../node_modules/firebase-tools/lib/api.js");
const firebaseAuth = require("../node_modules/firebase-tools/lib/auth.js");

function argument(name) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1]?.trim() : "";
  if (!value) throw new Error(`${name} is required.`);
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

function decodeValue(value) {
  if ("nullValue" in value) return null;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("stringValue" in value) return value.stringValue;
  if ("timestampValue" in value) {
    const timestamp = String(value.timestampValue);
    const fractional = timestamp.match(/\.(\d{1,9})Z$/)?.[1] ?? "";
    return {
      nanoseconds: Number(fractional.padEnd(9, "0")),
      seconds: Math.floor(Date.parse(timestamp) / 1000),
    };
  }
  if ("bytesValue" in value) return value.bytesValue;
  if ("referenceValue" in value) return value.referenceValue;
  if ("geoPointValue" in value) return value.geoPointValue;
  if ("arrayValue" in value) return (value.arrayValue.values ?? []).map(decodeValue);
  if ("mapValue" in value) return decodeFields(value.mapValue.fields ?? {});
  throw new Error("Unsupported Firestore response value.");
}

function decodeFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
}

function safeUser(value) {
  const clean = {...value};
  for (const key of ["password", "plainPassword", "passwordHash", "resetPassword"]) delete clean[key];
  return clean;
}

async function listCollection(client, projectId, collectionName) {
  const root = `/v1/projects/${projectId}/databases/(default)/documents/${collectionName}`;
  const documents = [];
  let pageToken = "";
  do {
    const response = await client.get(root, {queryParams: {...(pageToken ? {pageToken} : {}), pageSize: 300}});
    for (const document of response.body.documents ?? []) {
      documents.push({id: String(document.name).split("/").at(-1), ...decodeFields(document.fields)});
    }
    pageToken = response.body.nextPageToken ?? "";
  } while (pageToken);
  return documents.sort((left, right) => left.id.localeCompare(right.id));
}

async function getSettings(client, projectId) {
  try {
    const response = await client.get(`/v1/projects/${projectId}/databases/(default)/documents/settings/app`);
    return decodeFields(response.body.fields);
  } catch (error) {
    const missing = error?.status === 404 || error?.context?.response?.status === 404 || error?.context?.response?.statusCode === 404;
    if (missing) return {};
    throw error;
  }
}

const projectId = argument("--project");
const exportPath = resolve(argument("--export"));
const frozen = JSON.parse(await readFile(exportPath, "utf8"));
if (frozen?.meta?.projectId !== projectId || !String(frozen?.meta?.exportMode ?? "").startsWith("read-only")) throw new Error("The supplied export does not match the requested live project.");
const collectionNames = ["rooms", "payments", "maintenance", "electricityBills", "users", "auditLogs"];

const account = firebaseAuth.getProjectDefaultAccount(resolve(".")) ?? firebaseAuth.getGlobalDefaultAccount();
if (!account) throw new Error("Firebase CLI is not signed in.");
firebaseAuth.setActiveAccount({project: projectId}, account);
const client = new Client({auth: true, urlPrefix: firestoreOrigin()});

const liveEntries = await Promise.all(collectionNames.map(async (name) => [name, await listCollection(client, projectId, name)]));
const live = Object.fromEntries(liveEntries);
live.users = live.users.map(safeUser);
const changedCollections = [];
const differenceSummary = {};
for (const name of collectionNames) {
  const frozenDocuments = [...(frozen.data?.[name] ?? [])].sort((left, right) => String(left.id).localeCompare(String(right.id)));
  if (canonicalJson(live[name]) !== canonicalJson(frozenDocuments)) {
    changedCollections.push(name);
    differenceSummary[name] = differencePaths(live[name], frozenDocuments);
  }
}
const liveSettings = await getSettings(client, projectId);
const settingsMatch = canonicalJson(liveSettings) === canonicalJson(frozen.settings ?? {});
if (!settingsMatch) differenceSummary.settings = differencePaths(liveSettings, frozen.settings ?? {});
const liveCounts = Object.fromEntries(collectionNames.map((name) => [name, live[name].length]));
const passed = changedCollections.length === 0 && settingsMatch;

process.stdout.write(`${JSON.stringify({
  changedCollections,
  differenceSummary,
  exportGeneratedAt: frozen.meta.generatedAt,
  liveCounts,
  passed,
  projectId,
  settingsMatch,
}, null, 2)}\n`);
if (!passed) process.exitCode = 2;
