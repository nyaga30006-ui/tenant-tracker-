import {readFile} from "node:fs/promises";
import {resolve} from "node:path";
import {getApps, initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";

const ROLE_ACCOUNTS = {
  admin: {
    displayName: "Migration Preview Admin",
    email: "preview-admin@myproperty.test",
    password: "PreviewOnly123!",
  },
  caretaker: {
    displayName: "Migration Preview Caretaker",
    email: "preview-caretaker@myproperty.test",
    password: "PreviewCare123!",
  },
  landlord: {
    displayName: "Migration Preview Landlord",
    email: "preview-landlord@myproperty.test",
    password: "PreviewLand123!",
  },
};

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
const users = bundle.users?.filter((user) => ROLE_ACCOUNTS[user?.role] && typeof user?.id === "string" && user.id) ?? [];
if (!users.some((user) => user.role === "admin")) throw new Error("The migration bundle has no administrator profile.");

const authentication = getAuth(getApps()[0] ?? initializeApp({projectId}));
const roleCounts = new Map();
const createdAccounts = [];
for (const user of users) {
  const count = (roleCounts.get(user.role) ?? 0) + 1;
  roleCounts.set(user.role, count);
  const template = ROLE_ACCOUNTS[user.role];
  const email = count === 1 ? template.email : template.email.replace("@", `-${count}@`);
  const account = {
    disabled: user.disabled === true,
    displayName: count === 1 ? template.displayName : `${template.displayName} ${count}`,
    email,
    password: template.password,
  };
  try {
    await authentication.createUser({uid: user.id, ...account});
  } catch (error) {
    if (error?.code !== "auth/uid-already-exists") throw error;
    await authentication.updateUser(user.id, account);
  }
  createdAccounts.push({email, password: template.password, role: user.role});
}

console.log("Migration preview Auth accounts are ready in the local emulator.");
for (const account of createdAccounts) {
  console.log(`${account.role}: ${account.email} / ${account.password}`);
}
