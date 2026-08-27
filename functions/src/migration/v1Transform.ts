type UnknownRecord = Record<string, unknown>;

export interface V1Export {
  auditLogs?: UnknownRecord[];
  data?: UnknownRecord;
  electricityBills?: UnknownRecord[];
  maintenance?: UnknownRecord[];
  payments?: UnknownRecord[];
  rooms?: UnknownRecord[];
  settings?: UnknownRecord;
  users?: UnknownRecord[];
}

export interface V1TransformOptions {
  address: string;
  billingResetDay?: number;
  city: string;
  duplicateReceiptStrategy?: "block" | "suffix";
  migrationDate: string;
  preferredPaymentMethod?: "bank" | "cash" | "mpesa";
  propertyId: string;
  propertyName?: string;
}

export interface V2MigrationBundle {
  collections: {
    auditLogs: UnknownRecord[];
    billingResets: UnknownRecord[];
    electricityBills: UnknownRecord[];
    maintenance: UnknownRecord[];
    paymentReferences: UnknownRecord[];
    payments: UnknownRecord[];
    rooms: UnknownRecord[];
    tenantResidencies: UnknownRecord[];
  };
  property: UnknownRecord;
  report: {
    canImport: boolean;
    counts: Record<string, number>;
    errors: string[];
    paymentAmountTotal: number;
    roomFinancialTotals: { arrears: number; credit: number; paid: number; rent: number };
    warnings: string[];
  };
  source: "myproperty-v1";
  users: UnknownRecord[];
  version: 2;
}

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : value === null || value === undefined ? "" : String(value).trim();
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateValue(value: unknown, fallback: string): string {
  const candidate = text(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return candidate;
  const dayFirst = candidate.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dayFirst) {
    const [, day, month, year] = dayFirst;
    const isoDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    const parsedDayFirst = new Date(`${isoDate}T00:00:00Z`);
    if (!Number.isNaN(parsedDayFirst.getTime())
      && parsedDayFirst.getUTCFullYear() === Number(year)
      && parsedDayFirst.getUTCMonth() + 1 === Number(month)
      && parsedDayFirst.getUTCDate() === Number(day)) return isoDate;
  }
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString().slice(0, 10);
}

function safeId(value: unknown, fallback: string): string {
  return text(value) || fallback;
}

function slug(value: unknown): string {
  return text(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown";
}

function normalisedReference(value: unknown): string {
  return text(value).toUpperCase().replace(/\s+/g, "");
}

function roomStatus(room: UnknownRecord): "credit" | "paid" | "partial" | "unpaid" | "vacant" {
  if (!text(room.tenant)) return "vacant";
  const balance = numberValue(room.rent) + numberValue(room.arrears) - numberValue(room.credit) - numberValue(room.paid);
  if (balance < 0) return "credit";
  if (balance === 0) return "paid";
  if (balance < numberValue(room.rent)) return "partial";
  return "unpaid";
}

function duplicateValues(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values.filter(Boolean)) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

function roleValue(value: unknown): "admin" | "caretaker" | "landlord" {
  return value === "admin" || value === "caretaker" ? value : "landlord";
}

function collectionRecords(root: UnknownRecord, nested: UnknownRecord, key: string): UnknownRecord[] {
  const value = Array.isArray(root[key]) ? root[key] : nested[key];
  return Array.isArray(value) ? value.map(record) : [];
}

function validDateInput(value: unknown): boolean {
  const candidate = text(value);
  return Boolean(candidate) && !Number.isNaN(new Date(candidate).getTime());
}

function paymentTypeValue(value: unknown): "deposit" | "electricity" | "rent" {
  return value === "deposit" || value === "electricity" ? value : "rent";
}

export function transformV1Export(source: V1Export, options: V1TransformOptions): V2MigrationBundle {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.migrationDate)) errors.push("migrationDate must use YYYY-MM-DD.");
  if (!text(options.propertyId)) errors.push("propertyId is required.");
  if (text(options.propertyId).includes("/")) errors.push("propertyId cannot contain a slash.");

  const root = record(source);
  const nested = record(source.data);
  const sourceRooms = collectionRecords(root, nested, "rooms");
  const sourcePayments = collectionRecords(root, nested, "payments");
  const sourceMaintenance = collectionRecords(root, nested, "maintenance");
  const sourceElectricityBills = collectionRecords(root, nested, "electricityBills");
  const sourceUsers = collectionRecords(root, nested, "users");
  const sourceAuditLogs = collectionRecords(root, nested, "auditLogs");
  const settings = Object.keys(record(root.settings)).length ? record(root.settings) : record(nested.settings);
  const roomIds = sourceRooms.map((room, index) => safeId(room.id, `legacy-room-${index + 1}`));
  const paymentIds = sourcePayments.map((payment, index) => safeId(payment.id, `legacy-payment-${index + 1}`));
  for (const id of duplicateValues(roomIds)) errors.push(`Duplicate room ID: ${id}`);
  for (const id of duplicateValues(paymentIds)) errors.push(`Duplicate payment ID: ${id}`);
  for (const roomNumber of duplicateValues(sourceRooms.map((room) => text(room.number).toLowerCase().replace(/\s+/g, " ")))) {
    errors.push(`Duplicate room number: ${roomNumber}`);
  }
  for (const id of duplicateValues(sourceUsers.map((user) => text(user.id)))) errors.push(`Duplicate user ID: ${id}`);
  sourceUsers.forEach((user, index) => {
    if (!text(user.id)) errors.push(`User ${index + 1} has no Firebase Authentication UID.`);
  });
  sourcePayments.forEach((payment, index) => {
    const label = text(payment.id) || `payment ${index + 1}`;
    const roomId = text(payment.roomId);
    if (!roomId || !roomIds.includes(roomId)) errors.push(`${label} points to missing room ID: ${roomId || "(blank)"}`);
    if (numberValue(payment.amount) <= 0) errors.push(`${label} has a non-positive amount.`);
    if (!validDateInput(payment.rawDate ?? payment.date ?? payment.ts)) errors.push(`${label} has no valid payment date.`);
  });

  const users = sourceUsers.map((user, index) => {
    const role = roleValue(user.role);
    return {
      assignedPropertyIds: role === "admin" ? [] : [options.propertyId],
      disabled: user.disabled === true,
      email: text(user.email),
      id: safeId(user.id, `legacy-user-${index + 1}`),
      landlordAccess: role === "admin" ? "full" : "view",
      role,
      username: text(user.username) || text(user.email) || `Imported user ${index + 1}`,
    };
  });
  const roomById = new Map(sourceRooms.map((room, index) => [roomIds[index], room]));
  const residencyByKey = new Map<string, UnknownRecord>();

  function residencyFor(roomId: string, tenant: string, active: boolean, relevantPayments: UnknownRecord[], depositHeld = 0): string | undefined {
    if (!tenant) return undefined;
    const key = `${roomId}\u0000${tenant.toLowerCase()}`;
    const existing = residencyByKey.get(key);
    if (existing) return text(existing.id);
    const dates = relevantPayments.map((payment) => dateValue(payment.rawDate ?? payment.date ?? payment.ts, options.migrationDate)).sort();
    const id = `legacy-${active ? "active" : "former"}-${slug(roomId)}-${slug(tenant)}`;
    residencyByKey.set(key, {
      depositHeld,
      depositSettlementStatus: active ? "pending" : "settled",
      id,
      moveInDate: dates[0] ?? options.migrationDate,
      moveInNote: "Imported from Version 1; original move-in date was unavailable and may be estimated.",
      ...(active ? {} : { moveOutDate: dates.at(-1) ?? options.migrationDate, moveOutNote: "Imported former residency inferred from Version 1 payment records." }),
      movedInBy: "Version 1 migration",
      roomId,
      status: active ? "active" : "former",
      tenantName: tenant,
    });
    return id;
  }

  const rooms = sourceRooms.map((sourceRoom, index) => {
    const id = roomIds[index];
    const tenant = text(sourceRoom.tenant);
    const tenantPayments = sourcePayments.filter((payment) => text(payment.roomId) === id && text(payment.tenant).toLowerCase() === tenant.toLowerCase());
    const activeResidencyId = residencyFor(id, tenant, true, tenantPayments, numberValue(sourceRoom.depositPaid));
    const electricityDueEnabled = sourceRoom.electricityDueEnabled === true;
    if (tenant && electricityDueEnabled && sourceRoom.electricityPaid === undefined) {
      errors.push(`${text(sourceRoom.number) || id} has a Version 1 electricity charge but no separate electricityPaid balance; an administrator must allocate it before import.`);
    }
    return {
      ...(activeResidencyId ? { activeResidencyId } : {}),
      arrears: numberValue(sourceRoom.arrears),
      credit: numberValue(sourceRoom.credit),
      depositDueEnabled: sourceRoom.depositDueEnabled === true,
      depositPaid: numberValue(sourceRoom.depositPaid),
      depositRequired: numberValue(sourceRoom.depositRequired),
      electricityDueEnabled,
      electricityFee: numberValue(sourceRoom.electricityFee) || 2500,
      electricityPaid: numberValue(sourceRoom.electricityPaid),
      floor: numberValue(sourceRoom.floor),
      id,
      lastResetMonth: text(sourceRoom.lastResetMonth) || undefined,
      number: text(sourceRoom.number) || `Room ${String(index + 1).padStart(2, "0")}`,
      paid: numberValue(sourceRoom.paid),
      rent: numberValue(sourceRoom.rent),
      status: roomStatus(sourceRoom),
      tenant,
    };
  });

  const payments: UnknownRecord[] = sourcePayments.map((sourcePayment, index) => {
    const id = paymentIds[index];
    const roomId = text(sourcePayment.roomId);
    const sourceRoom = roomById.get(roomId);
    const tenant = text(sourcePayment.tenant) || text(sourceRoom?.tenant);
    const current = Boolean(sourceRoom && tenant && tenant.toLowerCase() === text(sourceRoom.tenant).toLowerCase());
    const matchingPayments = sourcePayments.filter((payment) => text(payment.roomId) === roomId && text(payment.tenant || sourceRoom?.tenant).toLowerCase() === tenant.toLowerCase());
    const residencyId = residencyFor(roomId, tenant, current, matchingPayments);
    const method = sourcePayment.method === "mpesa" || sourcePayment.method === "bank" ? sourcePayment.method : "cash";
    const rawDate = dateValue(sourcePayment.rawDate ?? sourcePayment.date ?? sourcePayment.ts, options.migrationDate);
    const reference = text(sourcePayment.refNumber ?? sourcePayment.mpesaCode);
    const paymentType = paymentTypeValue(sourcePayment.paymentType);
    return {
      amount: numberValue(sourcePayment.amount),
      corrected: sourcePayment.corrected === true,
      id,
      method,
      note: text(sourcePayment.note) || undefined,
      paymentType,
      provider: method === "mpesa" ? "mpesa" : method === "bank" ? "kcb" : "manual",
      receivedAt: `${rawDate}T12:00:00+03:00`,
      receiptNo: text(sourcePayment.receiptNo ?? sourcePayment.serial) || undefined,
      recordedBy: text(sourcePayment.by) || "Version 1 migration",
      reference,
      residency: current ? "current" : "former",
      ...(residencyId ? { residencyId } : {}),
      roomId,
      status: "confirmed",
      tenant,
    };
  });

  const receiptDuplicates = duplicateValues(payments.map((payment) => text(payment.receiptNo)));
  const referenceDuplicates = duplicateValues(payments.map((payment) => normalisedReference(payment.reference)));
  if (options.duplicateReceiptStrategy === "suffix") {
    const duplicateReceipts = new Set(receiptDuplicates);
    const receiptOccurrences = new Map<string, number>();
    const usedReceipts = new Set(payments.map((payment) => text(payment.receiptNo)).filter(Boolean));
    for (const payment of payments) {
      const originalReceipt = text(payment.receiptNo);
      if (!duplicateReceipts.has(originalReceipt)) continue;
      const occurrence = (receiptOccurrences.get(originalReceipt) ?? 0) + 1;
      receiptOccurrences.set(originalReceipt, occurrence);
      if (occurrence === 1) continue;
      let suffix = occurrence;
      let migratedReceipt = `${originalReceipt}-MIG${suffix}`;
      while (usedReceipts.has(migratedReceipt)) {
        suffix += 1;
        migratedReceipt = `${originalReceipt}-MIG${suffix}`;
      }
      usedReceipts.add(migratedReceipt);
      payment.legacyReceiptNo = originalReceipt;
      payment.receiptNo = migratedReceipt;
    }
    for (const receipt of receiptDuplicates) {
      warnings.push(`Duplicate Version 1 receipt ${receipt} was retained on its first payment; later occurrences were suffixed and preserve the original as legacyReceiptNo.`);
    }
  } else {
    for (const receipt of receiptDuplicates) errors.push(`Duplicate receipt number: ${receipt}`);
  }
  for (const reference of referenceDuplicates) errors.push(`Duplicate payment reference: ${reference}`);
  const reservedReferences = new Set<string>();
  const paymentReferences: UnknownRecord[] = [];
  for (const payment of payments) {
    const reference = normalisedReference(payment.reference);
    if (!reference || reservedReferences.has(reference)) continue;
    reservedReferences.add(reference);
    paymentReferences.push({ id: encodeURIComponent(reference), paymentId: payment.id, reference: payment.reference });
  }

  const maintenance = sourceMaintenance.map((item, index) => {
    const details = record(item.details);
    const category = item.category === "property_equipment" || item.category === "technology" ? item.category : "maintenance";
    const rawDate = dateValue(item.rawDate ?? item.dateReported ?? item.date ?? item.ts, options.migrationDate);
    const status = item.status === "in-progress" || item.status === "completed" ? item.status : "reported";
    return {
      amount: numberValue(item.amount),
      assignedTo: text(details.assignedTo ?? item.assignedTo) || undefined,
      category,
      description: text(item.description ?? item.desc) || undefined,
      id: safeId(item.id, `legacy-maintenance-${index + 1}`),
      priority: text(details.priority ?? item.priority) || undefined,
      reportedAt: `${rawDate}T12:00:00+03:00`,
      reportedBy: text(item.reportedBy ?? item.reporter) || "Version 1 migration",
      resolvedAt: text(item.dateResolved) || undefined,
      roomNumber: text(item.roomNumber ?? details.roomNumber) || undefined,
      status,
      title: text(item.title) || `Imported maintenance ${index + 1}`,
      area: text(item.area ?? details.area) || undefined,
      assetTag: text(item.assetTag ?? details.assetTag) || undefined,
      location: text(item.location ?? details.location) || undefined,
      quantity: numberValue(item.quantity ?? details.quantity) || undefined,
      unitCost: numberValue(item.unitCost ?? details.unitCost) || undefined,
      urgency: details.urgency === "urgent" || details.urgency === "soon" ? details.urgency : "routine",
    };
  });

  const electricityBills = sourceElectricityBills.map((item, index) => ({
    amount: numberValue(item.amount),
    area: item.area === "apartment" || item.area === "borehole" ? item.area : "security",
    dueDate: dateValue(item.dueDate, options.migrationDate),
    id: safeId(item.id, `legacy-electricity-${index + 1}`),
    month: text(item.month) || options.migrationDate.slice(0, 7),
    note: text(item.note) || undefined,
    recordedBy: text(item.recordedBy ?? item.createdBy) || "Version 1 migration",
    status: item.status === "paid" ? "paid" : "unpaid",
  }));

  const history = Array.isArray(settings.cycleHistory) ? settings.cycleHistory.map(record) : [];
  const billingResets = history.map((item, index) => ({
    arrearsCarried: numberValue(item.totalArrears),
    id: text(item.monthKey) || `legacy-reset-${index + 1}`,
    kind: "legacy",
    month: text(item.monthKey),
    recordedBy: text(item.by) || "Version 1 migration",
    resetAt: dateValue(item.date, options.migrationDate),
    roomsProcessed: numberValue(item.processed),
    status: "completed",
  }));
  const auditLogs = sourceAuditLogs.map((item, index) => ({ ...item, id: safeId(item.id, `legacy-audit-${index + 1}`), migrationSource: "myproperty-v1" }));
  const occupiedUnits = rooms.filter((room) => text(room.tenant)).length;
  const landlord = users.find((user) => user.role === "landlord") ?? users.find((user) => user.role === "admin");
  const roomFinancialTotals = rooms.reduce((totals, room) => ({
    arrears: totals.arrears + numberValue(room.arrears),
    credit: totals.credit + numberValue(room.credit),
    paid: totals.paid + numberValue(room.paid),
    rent: totals.rent + numberValue(room.rent),
  }), { arrears: 0, credit: 0, paid: 0, rent: 0 });
  if (residencyByKey.size) warnings.push("Imported residency dates are estimated where Version 1 had no explicit move-in or move-out date.");
  if (!sourceRooms.some((room) => room.depositPaid !== undefined || room.depositRequired !== undefined)) warnings.push("The backup has no separate deposit fields; deposit balances default to zero and require administrator review.");
  if (!sourceRooms.some((room) => room.electricityPaid !== undefined)) warnings.push("The backup has no separate electricityPaid fields; electricity balances default to zero and require administrator review.");
  if (!Array.isArray(root.electricityBills) && !Array.isArray(nested.electricityBills)) warnings.push("The backup did not include the electricityBills collection; export it separately before final migration.");

  return {
    collections: { auditLogs, billingResets, electricityBills, maintenance, paymentReferences, payments, rooms, tenantResidencies: [...residencyByKey.values()] },
    property: {
      address: text(options.address),
      billingResetDay: Math.min(28, Math.max(1, Math.floor(options.billingResetDay ?? 2))),
      city: text(options.city),
      collectedThisMonth: roomFinancialTotals.paid,
      id: options.propertyId,
      landlordId: text(landlord?.id),
      maintenanceUnits: maintenance.filter((item) => item.status !== "completed").length,
      monthlyRentTarget: rooms.filter((room) => text(room.tenant)).reduce((sum, room) => sum + numberValue(room.rent), 0),
      name: text(options.propertyName) || text(settings.propname) || "Imported Property",
      occupiedUnits,
      preferredPaymentMethod: options.preferredPaymentMethod ?? "bank",
      provisioningState: "migration-preview",
      roomCount: rooms.length,
      schemaVersion: 2,
      units: rooms.length,
    },
    report: {
      canImport: errors.length === 0,
      counts: {
        sourceAuditLogs: sourceAuditLogs.length,
        sourceElectricityBills: sourceElectricityBills.length,
        sourceMaintenance: sourceMaintenance.length,
        sourcePayments: sourcePayments.length,
        sourceRooms: sourceRooms.length,
        sourceUsers: sourceUsers.length,
        v2AuditLogs: auditLogs.length,
        v2BillingResets: billingResets.length,
        v2ElectricityBills: electricityBills.length,
        v2Maintenance: maintenance.length,
        v2Payments: payments.length,
        v2Residencies: residencyByKey.size,
        v2Rooms: rooms.length,
        v2Users: users.length,
      },
      errors,
      paymentAmountTotal: payments.reduce((sum, payment) => sum + numberValue(payment.amount), 0),
      roomFinancialTotals,
      warnings,
    },
    source: "myproperty-v1",
    users,
    version: 2,
  };
}
