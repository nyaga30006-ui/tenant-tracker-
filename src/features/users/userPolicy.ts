import type { AppUser, UserRole } from "../../types/domain";

export const MAX_LANDLORDS = 5;
export const MAX_USERS = 10;

export function canAddUser(users: AppUser[]): boolean {
  return users.filter((user) => !user.disabled).length < MAX_USERS;
}

export function canAddLandlord(users: AppUser[]): boolean {
  return users.filter((user) => !user.disabled && user.role === "landlord").length < MAX_LANDLORDS;
}

export function remainingUserSlots(users: AppUser[]): number {
  const activeUsers = users.filter((user) => !user.disabled).length;
  return Math.max(0, MAX_USERS - activeUsers);
}

export function remainingLandlordSlots(users: AppUser[]): number {
  return Math.max(0, MAX_LANDLORDS - users.filter((user) => !user.disabled && user.role === "landlord").length);
}

export function roleLabel(role: UserRole): string {
  return { admin: "Administrator", landlord: "Landlord", caretaker: "Caretaker" }[role];
}
