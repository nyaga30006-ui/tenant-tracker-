import { describe, expect, it } from "vitest";
import { userFixture } from "../test/fixtures";
import { permissionsFor } from "./AccessContext";

describe("user permissions", () => {
  it("gives admins full control", () => {
    const permissions = permissionsFor(userFixture({ role: "admin", landlordAccess: "full" }));
    expect(permissions.isReadOnly).toBe(false);
    expect(Object.entries(permissions).filter(([key]) => key !== "isReadOnly").every(([, value]) => value)).toBe(true);
  });

  it("limits caretakers to operational recording without dashboard, rooms, users, or resets", () => {
    const permissions = permissionsFor(userFixture({ role: "caretaker" }));
    expect(permissions).toMatchObject({ canRecordPayments: true, canManageWater: true, canManageRooms: false, canManageUsers: false, canResetMonths: false, canViewDashboard: false });
  });

  it("keeps view-only landlords read-only and grants approved full access", () => {
    expect(permissionsFor(userFixture({ landlordAccess: "view" })).isReadOnly).toBe(true);
    expect(permissionsFor(userFixture({ landlordAccess: "full" }))).toMatchObject({ canManageRooms: true, canRecordPayments: true, isReadOnly: false });
  });
});
