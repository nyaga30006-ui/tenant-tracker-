import {readFile} from "node:fs/promises";
import {createRequire} from "node:module";
import {resolve} from "node:path";

const require = createRequire(import.meta.url);
const {Client} = require("../node_modules/firebase-tools/lib/apiv2.js");
const firebaseAuth = require("../node_modules/firebase-tools/lib/auth.js");
const {identityOrigin} = require("../node_modules/firebase-tools/lib/api.js");

function argument(name) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1]?.trim() : "";
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function safeBundle(value) {
  if (!value || typeof value !== "object" || value.source !== "myproperty-v1" || value.version !== 2 || !Array.isArray(value.users)) {
    throw new Error("The supplied file is not a MyProperty V2 migration bundle.");
  }
  return value;
}

async function lookup(client, projectId, field, values) {
  const response = await client.post(`/v1/projects/${projectId}/accounts:lookup`, {[field]: values}, {
    queryParams: {fields: "users(localId,email,disabled)"},
    skipLog: {body: true},
  });
  return response.body.users ?? [];
}

const projectId = argument("--project");
const bundlePath = resolve(argument("--bundle"));
const bundle = safeBundle(JSON.parse(await readFile(bundlePath, "utf8")));
const profiles = bundle.users.map((profile) => ({
  disabled: profile.disabled === true,
  email: String(profile.email ?? "").trim().toLowerCase(),
  id: String(profile.id ?? "").trim(),
  role: String(profile.role ?? "unknown"),
}));
if (profiles.some((profile) => !profile.id || !profile.email)) throw new Error("Every migrated profile must have a UID and email before authentication can be audited.");

const account = firebaseAuth.getProjectDefaultAccount(resolve(".")) ?? firebaseAuth.getGlobalDefaultAccount();
if (!account) throw new Error("Firebase CLI is not signed in. Run firebase login first.");
firebaseAuth.setActiveAccount({project: projectId}, account);

const client = new Client({auth: true, urlPrefix: identityOrigin()});
const [usersByUidResponse, usersByEmailResponse] = await Promise.all([
  lookup(client, projectId, "localId", profiles.map((profile) => profile.id)),
  lookup(client, projectId, "email", profiles.map((profile) => profile.email)),
]);
const usersByUid = new Map(usersByUidResponse.map((user) => [user.localId, user]));
const usersByEmail = new Map(usersByEmailResponse.map((user) => [String(user.email ?? "").toLowerCase(), user]));
const results = profiles.map((profile) => {
  const uidAccount = usersByUid.get(profile.id);
  const emailAccount = usersByEmail.get(profile.email);
  return {
    enabledStateMatches: Boolean(uidAccount) && Boolean(uidAccount.disabled) === profile.disabled,
    emailMatchesUid: Boolean(uidAccount) && String(uidAccount.email ?? "").toLowerCase() === profile.email,
    emailUsesExpectedUid: Boolean(emailAccount) && emailAccount.localId === profile.id,
    role: profile.role,
    uidExists: Boolean(uidAccount),
  };
});
const passed = results.every((result) => result.uidExists && result.emailMatchesUid && result.emailUsesExpectedUid && result.enabledStateMatches);

process.stdout.write(`${JSON.stringify({passed, profileCount: profiles.length, projectId, results}, null, 2)}\n`);
if (!passed) process.exitCode = 2;
