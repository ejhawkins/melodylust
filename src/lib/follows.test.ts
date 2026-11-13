import { expect, test } from "vitest";
import { toggleFollow } from "./follows";
test("follow adds an influencer once; following again unfollows", () => {
  const a = { id: "abcdefghjk", author: "Ana" };
  const once = toggleFollow([], a); expect(once).toEqual([a]);
  expect(toggleFollow(once, a)).toEqual([]);
});
