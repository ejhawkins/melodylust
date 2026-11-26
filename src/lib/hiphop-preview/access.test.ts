import { expect, it } from "vitest";
import { canViewRoom } from "./access";

it("only serves the intended branch preview or local development", () => {
  const branch = "feature/hiphop-runway-preview";
  expect(canViewRoom("preview", branch, false)).toBe(true);
  expect(canViewRoom(undefined, undefined, true)).toBe(true);
  expect(canViewRoom("production", branch, true)).toBe(false);
  expect(canViewRoom("preview", "main", true)).toBe(false);
  expect(canViewRoom("preview", undefined, false)).toBe(false);
  expect(canViewRoom(undefined, branch, false)).toBe(false);
});
