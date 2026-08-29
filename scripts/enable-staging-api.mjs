import {createRequire} from "node:module";
import {resolve} from "node:path";

const require = createRequire(import.meta.url);
const firebaseAuth = require("../node_modules/firebase-tools/lib/auth.js");
const {ensure} = require("../node_modules/firebase-tools/lib/ensureApiEnabled.js");

const STAGING_PROJECT = "myproperty-v2-staging";
const ALLOWED_SERVICES = new Set(["firestore.googleapis.com"]);

function argument(name) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1]?.trim() : "";
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

const projectId = argument("--project");
const service = argument("--service");

if (projectId !== STAGING_PROJECT) {
  throw new Error(`Safety stop: this helper can only modify ${STAGING_PROJECT}.`);
}
if (!ALLOWED_SERVICES.has(service)) {
  throw new Error(`Safety stop: ${service} is not an approved staging service.`);
}

const account = firebaseAuth.getProjectDefaultAccount(resolve(".")) ?? firebaseAuth.getGlobalDefaultAccount();
if (!account) throw new Error("Firebase CLI is not signed in. Run firebase login first.");
firebaseAuth.setActiveAccount({project: projectId}, account);

await ensure(projectId, service, "staging");
process.stdout.write(`Enabled ${service} for ${projectId}.\n`);
