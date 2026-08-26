import { describe, expect, it } from "vitest";
import { collectionTone } from "./PremiumCollection";

describe("collectionTone", () => {
  it.each([
    [0, "danger"],
    [19, "danger"],
    [20, "warning"],
    [69, "warning"],
    [70, "good"],
    [99, "good"],
    [100, "complete"],
  ] as const)("uses the correct tone at %i%%", (rate, expectedTone) => {
    expect(collectionTone(rate)).toBe(expectedTone);
  });
});
