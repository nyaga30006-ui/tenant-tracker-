import type { AppUser, Payment, Room, TenantResidency } from "../types/domain";

export function roomFixture(overrides: Partial<Room> = {}): Room {
  return {
    activeResidencyId: "residency-1",
    arrears: 0,
    credit: 0,
    floor: 0,
    id: "room-1",
    number: "Room 01",
    paid: 0,
    rent: 7500,
    status: "unpaid",
    tenant: "Amina",
    ...overrides,
  };
}

export function paymentFixture(overrides: Partial<Payment> = {}): Payment {
  return {
    amount: 5000,
    id: "payment-1",
    method: "mpesa",
    paymentType: "rent",
    provider: "mpesa",
    receiptNo: "NYG-202608-0001",
    receivedAt: "2026-08-10T12:00:00+03:00",
    reference: "QWE123ABC",
    residency: "current",
    residencyId: "residency-1",
    roomId: "room-1",
    status: "confirmed",
    tenant: "Amina",
    ...overrides,
  };
}

export function residencyFixture(overrides: Partial<TenantResidency> = {}): TenantResidency {
  return {
    depositHeld: 7500,
    id: "residency-1",
    moveInDate: "2026-01-01",
    movedInBy: "Admin",
    roomId: "room-1",
    status: "active",
    tenantName: "Amina",
    ...overrides,
  };
}

export function userFixture(overrides: Partial<AppUser> = {}): AppUser {
  return {
    assignedPropertyIds: ["property-1"],
    disabled: false,
    email: "user@example.com",
    id: "user-1",
    landlordAccess: "view",
    role: "landlord",
    username: "Test User",
    ...overrides,
  };
}

