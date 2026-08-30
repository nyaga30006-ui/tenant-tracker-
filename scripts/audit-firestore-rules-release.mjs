import {createRequire} from "node:module";
import {resolve} from "node:path";

const require = createRequire(import.meta.url);
const {Client} = require("../node_modules/firebase-tools/lib/apiv2.js");
const {rulesOrigin} = require("../node_modules/firebase-tools/lib/api.js");
const firebaseAuth = require("../node_modules/firebase-tools/lib/auth.js");

const projectIndex = process.argv.indexOf("--project");
const projectId = projectIndex >= 0 ? process.argv[projectIndex + 1]?.trim() : "";
if (!projectId) throw new Error("--project is required.");

const account = firebaseAuth.getProjectDefaultAccount(resolve(".")) ?? firebaseAuth.getGlobalDefaultAccount();
if (!account) throw new Error("Firebase CLI is not signed in.");
firebaseAuth.setActiveAccount({project: projectId}, account);

const client = new Client({auth: true, urlPrefix: rulesOrigin()});
const response = await client.get(`/v1/projects/${projectId}/releases/cloud.firestore`);
process.stdout.write(`${JSON.stringify({
  createTime: response.body.createTime,
  name: response.body.name,
  rulesetName: response.body.rulesetName,
  updateTime: response.body.updateTime,
}, null, 2)}\n`);
