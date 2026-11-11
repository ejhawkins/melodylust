import { describe, expect, it } from "vitest";
import { isStylist } from "./stylist";

describe("isStylist", () => {
  it("lets editors share", () => { expect(isStylist({ roles: ["moderator"], published: 0 })).toBe(true); expect(isStylist({ roles: ["admin"], published: 0 })).toBe(true); });
  it("lets readers with a published note share", () => { expect(isStylist({ roles: ["user"], published: 1 })).toBe(true); });
  it("keeps the card from everyone else", () => { expect(isStylist({ roles: ["user"], published: 0 })).toBe(false); expect(isStylist({ roles: [], published: 0 })).toBe(false); });
});
