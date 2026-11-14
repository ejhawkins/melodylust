import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// public/sw.js is plain JavaScript the browser loads on its own, so the test reads the file
// and pulls out its one decision: which requests may be saved for offline use.
const source = readFileSync("public/sw.js", "utf8");
const strategyFor = new Function("self", "caches", `${source}; return strategyFor;`)({ addEventListener() {} }, {}) as (
  request: { method: string; url: string; mode: string; destination: string },
  origin: string,
) => string;

const origin = "https://www.melodylust.fashion";
const get = (path: string, extra: Partial<{ method: string; mode: string; destination: string }> = {}) =>
  strategyFor({ method: "GET", url: path.startsWith("http") ? path : origin + path, mode: "cors", destination: "", ...extra }, origin);

describe("service worker request rules", () => {
  it("fetches pages fresh and keeps a copy for offline", () => {
    expect(get("/", { mode: "navigate" })).toBe("page");
    expect(get("/board/abc", { mode: "navigate" })).toBe("page");
  });

  it("saves the app's own files and its web fonts", () => {
    expect(get("/assets/index-abc123.js", { destination: "script" })).toBe("asset");
    expect(get("/fonts/isidora-medium.woff2", { destination: "font" })).toBe("asset");
    expect(get("https://fonts.gstatic.com/s/bodonimoda/v1/x.woff2", { destination: "font" })).toBe("asset");
  });

  it("never saves server calls, writes, or other sites", () => {
    expect(get("/_serverFn/abc")).toBe("network");
    expect(get("/_serverFn/abc", { mode: "navigate" })).toBe("network");
    expect(get("/", { method: "POST", mode: "navigate" })).toBe("network");
    expect(get("https://cdn-images.farfetch-contents.com/a.jpg", { destination: "image" })).toBe("network");
    expect(get("https://example.supabase.co/auth/v1/token")).toBe("network");
  });
});
