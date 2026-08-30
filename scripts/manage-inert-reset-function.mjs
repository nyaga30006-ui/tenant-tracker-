import {createRequire} from "node:module";
import {resolve} from "node:path";

const require = createRequire(import.meta.url);
const {Client} = require("../node_modules/firebase-tools/lib/apiv2.js");
const {functionsV2Origin} = require("../node_modules/firebase-tools/lib/api.js");
const firebaseAuth = require("../node_modules/firebase-tools/lib/auth.js");

const PROJECT_ID = "myproperty-7a932";
const REGION = "africa-south1";
const FUNCTION_ID = "runScheduledBillingResets";
const CONFIRMATION = "DELETE_INERT_AFRICA_RESET_SHELL";

function argument(name) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1]?.trim() : "";
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

const mode = argument("--mode");
if (!new Set(["audit", "delete"]).has(mode)) throw new Error("--mode must be audit or delete.");
if (argument("--project") !== PROJECT_ID) throw new Error(`This cleanup is locked to ${PROJECT_ID}.`);
const expectedName = `projects/${PROJECT_ID}/locations/${REGION}/functions/${FUNCTION_ID}`;

const account = firebaseAuth.getProjectDefaultAccount(resolve(".")) ?? firebaseAuth.getGlobalDefaultAccount();
if (!account) throw new Error("Firebase CLI is not signed in.");
firebaseAuth.setActiveAccount({project: PROJECT_ID}, account);
const client = new Client({auth: true, urlPrefix: functionsV2Origin()});
const path = `/v2/${expectedName}`;
const response = await client.get(path);
if (response.body.name !== expectedName) throw new Error("The returned Cloud Function is not the locked cleanup target.");

const summary = {
  environment: response.body.environment,
  functionId: FUNCTION_ID,
  maxInstanceCount: response.body.serviceConfig?.maxInstanceCount ?? 0,
  minInstanceCount: response.body.serviceConfig?.minInstanceCount ?? 0,
  projectId: PROJECT_ID,
  region: REGION,
  state: response.body.state,
};
if (mode === "audit") {
  process.stdout.write(`${JSON.stringify({...summary, action: "none"}, null, 2)}\n`);
  process.exit(0);
}
if (argument("--confirm") !== CONFIRMATION) throw new Error(`Deletion requires --confirm ${CONFIRMATION}.`);
const deletion = await client.delete(path);
let operation = deletion.body;
for (let attempt = 0; !operation.done && attempt < 24; attempt += 1) {
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 5000));
  const progress = await client.get(`/v2/${operation.name}`);
  operation = progress.body;
}
if (!operation.done) throw new Error(`Deletion is still running: ${operation.name}`);
if (operation.error) throw new Error(`Deletion failed: ${operation.error.message ?? "unknown Cloud Functions error"}`);
process.stdout.write(`${JSON.stringify({...summary, action: "deleted"}, null, 2)}\n`);
