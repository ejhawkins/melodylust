import { expect, it } from "vitest";
import { frontPiece, snapAngle, shuffleRings } from "./swivel";
it("maps a ring angle to the nearest front piece", () => { expect(frontPiece(-90, 4)).toBe(1); expect(frontPiece(90, 4)).toBe(3); expect(frontPiece(-360, 4)).toBe(0); });
it("snaps rotation to a garment step", () => { expect(snapAngle(-73, 4)).toBe(-90); expect(snapAngle(12, 0)).toBe(0); });
it("shuffles unlocked rings while preserving locked pieces", () => { expect(shuffleRings([1, 2, 3, 0], [4, 4, 4, 4], [true, false, true, false], () => .75)).toEqual([1, 3, 3, 3]); });