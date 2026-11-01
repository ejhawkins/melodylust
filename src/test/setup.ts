import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Tests never touch the real .cache notebooks (evidence, products).
process.env["MELODYLUST_CACHE_DIR"] = mkdtempSync(join(tmpdir(), "melodylust-test-cache-"));
// The whole suite runs in parallel; give rendered results time to appear on a busy machine.
configure({ asyncUtilTimeout: 5000 });

// Pure-module tests opt into `@vitest-environment node`, where there is no window to stub.
if (typeof window !== "undefined") {
  Object.defineProperty(window, "scrollTo", {
    writable: true,
    value: () => {},
  });

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  });
}
