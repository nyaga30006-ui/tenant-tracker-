import assert from "node:assert/strict";
import test from "node:test";
import {assertEmulatorSafety} from "./importV2BundleToEmulator.js";

test("emulator migration guard accepts only local demo projects", () => {
  assert.doesNotThrow(() => assertEmulatorSafety("127.0.0.1:8080", "demo-myproperty"));
  assert.doesNotThrow(() => assertEmulatorSafety("localhost:8080", "demo-migration"));
  assert.throws(() => assertEmulatorSafety(undefined, "demo-myproperty"), /local emulator/);
  assert.throws(() => assertEmulatorSafety("firestore.googleapis.com:443", "demo-myproperty"), /local emulator/);
  assert.throws(() => assertEmulatorSafety("127.0.0.1:8080", "myproperty-7a932"), /must start with demo-/);
});
