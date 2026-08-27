import {readFile} from "node:fs/promises";
import {resolve} from "node:path";
import {getApps, initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";

const EMAIL = "preview-admin@myproperty.test";
const PASSWORD = "PreviewOnly123!";

function localEmulator(host) {
  return /^(127\.0\.0\.1|localhost):\d+$/.test(host ?? "");
}

function inputPath(args) {
  if (args.length !== 2 || args[0] !== "--input" || !args[1]) {
    throw new Error("Exactly one --input path is required.");
  }
  return resolve(args[1]);
}

const projectId = process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT;
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
if (!projectId?.startsWith("demo-") || !localEmulator(authHost)) {
  throw new Error("Refusing preview account creation: a demo- project and local Auth emulator are required.");
}

const bundle = JSON.parse(await readFile(inputPath(process.argv.slice(2)), "utf8"));
if (bundle?.source !== "myproperty-v1" || bundle?.version !== 2 || bundle?.report?.canImport !== true) {
  throw new Error("The input is not a reconciled MyProperty Version 2 migration bundle.");
}
const admin = bundle.users?.find((user) => user?.role === "admin" && typeof user?.id === "string" && user.id);
if (!admin) throw new Error("The migration bundle has no administrator profile.");

const authentication = getAuth(getApps()[0] ?? initializeApp({projectId}));
const account = {displayName: "Migration Preview Admin", email: EMAIL, password: PASSWORD};
try {
  await authentication.createUser({uid: admin.id, ...account});
} catch (error) {
  if (error?.code !== "auth/uid-already-exists") throw error;
  await authentication.updateUser(admin.id, account);
}

console.log("Migration preview Auth account is ready in the local emulator.");
console.log(`Email: ${EMAIL}`);
console.log(`Password: ${PASSWORD}`);
