import { canTransition } from "./order-transitions";

describe("canTransition (RBAC commande)", () => {
  it("autorise KITCHEN à passer IN_KITCHEN → READY", () => {
    expect(canTransition("IN_KITCHEN", "READY", "KITCHEN", false)).toBe(true);
  });

  it("refuse STAFF_POS pour IN_KITCHEN → READY", () => {
    expect(canTransition("IN_KITCHEN", "READY", "STAFF_POS", false)).toBe(
      false,
    );
  });

  it("plateforme owner peut forcer une transition valide", () => {
    expect(canTransition("PAID", "IN_KITCHEN", undefined, true)).toBe(true);
  });

  it("autorise STAFF_POS à encaisser PENDING_PAYMENT → PAID", () => {
    expect(
      canTransition("PENDING_PAYMENT", "PAID", "STAFF_POS", false),
    ).toBe(true);
  });
});
