/*
 * Run this file only in the browser console of the signed-in Version 1 app.
 * It performs Firestore reads and downloads JSON. It does not write an audit
 * log, update a document, or initialize a second Firebase app.
 */
(async function exportMyPropertyV1ReadOnly() {
  const expectedProjectId = "myproperty-7a932";
  const firebaseApi = globalThis.firebase;
  if (!firebaseApi?.apps?.length) throw new Error("Firebase is not initialized on this page.");
  const projectId = String(firebaseApi.app().options.projectId ?? "");
  if (projectId !== expectedProjectId) throw new Error(`Refusing export: expected ${expectedProjectId}, found ${projectId || "no project"}.`);
  const currentUser = firebaseApi.auth().currentUser;
  if (!currentUser) throw new Error("Sign in as the Version 1 administrator before exporting.");
  const database = firebaseApi.firestore();
  const collectionNames = ["rooms", "payments", "maintenance", "electricityBills", "users", "auditLogs"];

  function plainValue(value) {
    return JSON.parse(JSON.stringify(value, (_key, item) => item && typeof item.toDate === "function" ? item.toDate().toISOString() : item));
  }

  function safeUser(value) {
    const clean = {...value};
    for (const key of ["password", "plainPassword", "passwordHash", "resetPassword"]) delete clean[key];
    return clean;
  }

  const snapshots = await Promise.all(collectionNames.map((name) => database.collection(name).get()));
  const data = Object.fromEntries(snapshots.map((snapshot, index) => [
    collectionNames[index],
    snapshot.docs.map((document) => ({id: document.id, ...document.data()})),
  ]));
  data.users = data.users.map(safeUser);
  const settings = await database.collection("settings").doc("app").get();
  const generatedAt = new Date();
  const backup = plainValue({
    counts: Object.fromEntries(collectionNames.map((name) => [name, data[name].length])),
    data,
    meta: {
      app: "MyProperty Version 1",
      exportMode: "read-only",
      generatedAt: generatedAt.toISOString(),
      generatedByUid: currentUser.uid,
      projectId,
      schema: "firestore-collections-v1",
    },
    settings: settings.exists ? settings.data() : {},
  });
  const blob = new Blob([`${JSON.stringify(backup, null, 2)}\n`], {type: "application/json"});
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `myproperty-v1-readonly-${generatedAt.toISOString().replace(/[:.]/g, "-")}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  console.info("MyProperty V1 read-only export downloaded.", backup.counts);
  return backup.counts;
}());
