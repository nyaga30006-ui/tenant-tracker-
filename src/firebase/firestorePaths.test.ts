import { describe, expect, it } from "vitest";
import { propertyCollectionPath, propertyDocumentPath, propertyPath, propertyWaterSettingsPath, userPath } from "./firestorePaths";

describe("property-scoped Firestore paths", () => {
  it("keeps operational records below their property", () => {
    expect(propertyPath("nyaga")).toBe("properties/nyaga");
    expect(propertyCollectionPath("nyaga", "rooms")).toBe("properties/nyaga/rooms");
    expect(propertyDocumentPath("nyaga", "payments", "pay-1")).toBe("properties/nyaga/payments/pay-1");
    expect(propertyWaterSettingsPath("nyaga")).toBe("properties/nyaga/settings/water");
  });

  it("stores user profiles by Firebase Authentication uid", () => {
    expect(userPath("firebase-uid")).toBe("users/firebase-uid");
  });
});
