import { describe, expect, it } from "vitest";
import { roomFixture } from "../test/fixtures";
import { emptyLocalPropertyData, updateLocalPropertyData, type LocalDatabase } from "./localStorageRepository";

describe("property isolation", () => {
  it("updates only the selected property's records", () => {
    const first = { ...emptyLocalPropertyData(), rooms: [roomFixture({ id: "room-a" })] };
    const second = { ...emptyLocalPropertyData(), rooms: [roomFixture({ id: "room-b", number: "Room 20" })] };
    const database: LocalDatabase = { properties: { a: first, b: second }, users: [], version: 1 };
    const updated = updateLocalPropertyData(database, "a", (data) => ({ ...data, rooms: [...data.rooms, roomFixture({ id: "room-a2", number: "Room 02" })] }));
    expect(updated.properties.a.rooms).toHaveLength(2);
    expect(updated.properties.b).toEqual(second);
    expect(updated.properties.b).toBe(database.properties.b);
  });
});

