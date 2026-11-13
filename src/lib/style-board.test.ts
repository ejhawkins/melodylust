import { describe, expect, it } from "vitest";
import { boardId, isBoardId, sectionOf, toBoardItems } from "./style-board";

describe("style board", () => {
  it("sorts Want List saves into fashion, music and good reads", () => {
    expect(sectionOf({ kind: "song" })).toBe("music");
    expect(sectionOf({ kind: "piece", from: "Reading Room · Sample read" })).toBe("read");
    expect(sectionOf({ kind: "piece", from: "The Swivel" })).toBe("fashion");
  });
  it("drops non-web links", () => {
    const [item] = toBoardItems([{ id: "1", kind: "piece", name: "Coat", detail: "", link: "javascript:alert(1)", note: "", image: "https://x.com/a.jpg" }]);
    expect(item?.link).toBe("");
    expect(item?.image).toBe("https://x.com/a.jpg");
  });
  it("makes valid link ids", () => {
    const id = boardId(n => new Uint8Array(n).fill(33));
    expect(id).toBe("bbbbbbbbbb");
    expect(isBoardId(id)).toBe(true);
    expect(isBoardId("../etc")).toBe(false);
  });
});
