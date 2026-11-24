import { describe, expect, it, vi } from "vitest";
import { CHUNK_RETRY_KEY, isChunkLoadError, reloadOnceForChunkError } from "./chunk-retry";

const fakeWindow = () => {
  const store = new Map<string, string>();
  return {
    sessionStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) } as unknown as Storage,
    location: { reload: vi.fn() } as unknown as Location,
    store,
  };
};

describe("chunk retry", () => {
  it("recognises a failed script load in each browser's words", () => {
    expect(isChunkLoadError(new TypeError("Importing a module script failed."))).toBe(true);
    expect(isChunkLoadError(new TypeError("Failed to fetch dynamically imported module: https://x/assets/index-abc.js"))).toBe(true);
    expect(isChunkLoadError(new TypeError("error loading dynamically imported module"))).toBe(true);
    expect(isChunkLoadError(new Error("Cannot read properties of undefined"))).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });

  it("reloads once per tab, then lets the error show", () => {
    const win = fakeWindow();
    const error = new TypeError("Importing a module script failed.");
    expect(reloadOnceForChunkError(error, win)).toBe(true);
    expect(win.location.reload).toHaveBeenCalledTimes(1);
    expect(win.store.get(CHUNK_RETRY_KEY)).toBe("1");
    expect(reloadOnceForChunkError(error, win)).toBe(false);
    expect(win.location.reload).toHaveBeenCalledTimes(1);
  });

  it("leaves other errors to the error page", () => {
    const win = fakeWindow();
    expect(reloadOnceForChunkError(new Error("boom"), win)).toBe(false);
    expect(win.location.reload).not.toHaveBeenCalled();
  });
});
