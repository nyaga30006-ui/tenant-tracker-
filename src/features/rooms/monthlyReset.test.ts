import { describe, expect, it } from "vitest";
import { roomFixture } from "../../test/fixtures";
import { resetRoomForMonth, roomsReadyForReset } from "./monthlyReset";

describe("monthly resets", () => {
  it("carries unpaid recurring charges into arrears and clears paid this month", () => {
    const reset = resetRoomForMonth(roomFixture({ arrears: 1000, paid: 2500 }), "2026-08");
    expect(reset).toMatchObject({ arrears: 6000, credit: 0, lastResetMonth: "2026-08", paid: 0, status: "unpaid" });
  });

  it("carries excess payment as credit and cannot reset twice", () => {
    const reset = resetRoomForMonth(roomFixture({ paid: 8000 }), "2026-08");
    expect(reset.credit).toBe(500);
    expect(resetRoomForMonth(reset, "2026-08")).toEqual(reset);
  });

  it("excludes vacant and already-reset rooms", () => {
    const rooms = [roomFixture(), roomFixture({ id: "vacant", tenant: "" }), roomFixture({ id: "done", lastResetMonth: "2026-08" })];
    expect(roomsReadyForReset(rooms, "2026-08").map((room) => room.id)).toEqual(["room-1"]);
  });
});

