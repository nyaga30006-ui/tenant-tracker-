import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { delimiter, join, resolve } from "node:path";

function node22Executable() {
  if (process.versions.node.startsWith("22.")) return process.execPath;
  if (process.env.MYPROPERTY_NODE22 && existsSync(process.env.MYPROPERTY_NODE22)) return process.env.MYPROPERTY_NODE22;

  const toolsRoot = resolve(".tools");
  if (!existsSync(toolsRoot)) return "";
  return readdirSync(toolsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^node-v22\..*-win-x64$/.test(entry.name))
    .map((entry) => join(toolsRoot, entry.name, "node.exe"))
    .filter(existsSync)
    .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }))[0] ?? "";
}

function usableJavaHome(path) {
  return Boolean(path && existsSync(join(path, "bin", "java.exe")));
}

function findJavaHome() {
  if (usableJavaHome(process.env.FIREBASE_JAVA_HOME)) return process.env.FIREBASE_JAVA_HOME;

  const microsoftRoot = process.env.LOCALAPPDATA
    ? join(process.env.LOCALAPPDATA, "Programs", "Microsoft")
    : "";
  if (microsoftRoot && existsSync(microsoftRoot)) {
    const candidate = readdirSync(microsoftRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("jdk-21"))
      .map((entry) => join(microsoftRoot, entry.name))
      .filter(usableJavaHome)
      .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }))[0];
    if (candidate) return candidate;
  }

  return usableJavaHome(process.env.JAVA_HOME) ? process.env.JAVA_HOME : "";
}

const javaHome = findJavaHome();
const firebaseNode = node22Executable();
if (!firebaseNode) {
  console.error("Firebase requires Node.js 22. Install the project runtime in .tools or set MYPROPERTY_NODE22 to a Node 22 executable.");
  process.exit(1);
}
const environment = { ...process.env };
environment.Path = `${resolve(firebaseNode, "..")}${delimiter}${environment.Path ?? ""}`;
if (javaHome) {
  environment.JAVA_HOME = javaHome;
  environment.Path = `${join(javaHome, "bin")}${delimiter}${environment.Path ?? ""}`;
}

const firebaseCli = resolve("node_modules", "firebase-tools", "lib", "bin", "firebase.js");
const child = spawn(firebaseNode, [firebaseCli, ...process.argv.slice(2)], {
  env: environment,
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error(`Firebase CLI could not start: ${error.message}`);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode = signal ? 1 : (code ?? 1);
});
