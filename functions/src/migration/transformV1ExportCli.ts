import {mkdir, readFile, writeFile} from "node:fs/promises";
import {dirname, extname, basename, resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {transformV1Export, type V1Export, type V1TransformOptions} from "./v1Transform.js";

interface CliOptions extends V1TransformOptions {
  input: string;
  output: string;
  report: string;
}

const HELP = `Transform a read-only MyProperty Version 1 JSON export into a Version 2 preview bundle.

Usage:
  npm --prefix functions run migration:transform -- \\
    --input <v1-export.json> \\
    --output <v2-bundle.json> \\
    --property-id <property-id> \\
    --migration-date <YYYY-MM-DD> \\
    [--property-name <property-name>] \\
    [--address <address>] [--city <city>] \\
    [--billing-reset-day <1-28>] \\
    [--preferred-payment-method <bank|cash|mpesa>] \\
    [--duplicate-receipt-strategy <block|suffix>] \\
    [--report <reconciliation-report.json>]

This command reads and writes local JSON files only. It never connects to Firebase.
If validation fails, it writes the report but does not write an import bundle.`;

function outputReportPath(output: string): string {
  const extension = extname(output);
  const name = extension ? basename(output, extension) : basename(output);
  return resolve(dirname(output), `${name}.report.json`);
}

function flagValues(args: string[]): Map<string, string> {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (!flag.startsWith("--")) throw new Error(`Unexpected argument: ${flag}`);
    const value = args[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${flag}`);
    values.set(flag, value);
    index += 1;
  }
  return values;
}

function requiredFlag(values: Map<string, string>, flag: string): string {
  const value = values.get(flag)?.trim();
  if (!value) throw new Error(`${flag} is required.`);
  return value;
}

function parseOptions(args: string[]): CliOptions {
  const values = flagValues(args);
  const input = resolve(requiredFlag(values, "--input"));
  const output = resolve(requiredFlag(values, "--output"));
  const propertyId = requiredFlag(values, "--property-id");
  const migrationDate = requiredFlag(values, "--migration-date");
  const resetValue = values.get("--billing-reset-day");
  const billingResetDay = resetValue === undefined ? undefined : Number(resetValue);
  if (billingResetDay !== undefined && (!Number.isInteger(billingResetDay) || billingResetDay < 1 || billingResetDay > 28)) {
    throw new Error("--billing-reset-day must be a whole number from 1 to 28.");
  }
  const method = values.get("--preferred-payment-method");
  if (method !== undefined && method !== "bank" && method !== "cash" && method !== "mpesa") {
    throw new Error("--preferred-payment-method must be bank, cash, or mpesa.");
  }
  const duplicateReceiptStrategy = values.get("--duplicate-receipt-strategy");
  if (duplicateReceiptStrategy !== undefined && duplicateReceiptStrategy !== "block" && duplicateReceiptStrategy !== "suffix") {
    throw new Error("--duplicate-receipt-strategy must be block or suffix.");
  }
  return {
    address: values.get("--address") ?? "",
    billingResetDay,
    city: values.get("--city") ?? "",
    duplicateReceiptStrategy,
    input,
    migrationDate,
    output,
    preferredPaymentMethod: method,
    propertyId,
    propertyName: values.get("--property-name"),
    report: resolve(values.get("--report") ?? outputReportPath(output)),
  };
}

function v1Export(value: unknown): V1Export {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("The input JSON root must be an object.");
  return value as V1Export;
}

export async function runCli(args: string[]): Promise<number> {
  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write(`${HELP}\n`);
    return 0;
  }
  const options = parseOptions(args);
  if (options.input === options.output || options.input === options.report) throw new Error("Input, output, and report paths must be different.");
  const source = v1Export(JSON.parse(await readFile(options.input, "utf8")) as unknown);
  const bundle = transformV1Export(source, options);
  await mkdir(dirname(options.report), {recursive: true});
  await writeFile(options.report, `${JSON.stringify(bundle.report, null, 2)}\n`, "utf8");
  if (!bundle.report.canImport) {
    process.stderr.write(`Validation failed. Report written to ${options.report}\n`);
    for (const error of bundle.report.errors) process.stderr.write(`- ${error}\n`);
    return 2;
  }
  await mkdir(dirname(options.output), {recursive: true});
  await writeFile(options.output, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
  process.stdout.write(`Version 2 preview bundle: ${options.output}\nReconciliation report: ${options.report}\n`);
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
