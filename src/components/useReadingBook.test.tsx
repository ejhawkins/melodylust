import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { useReadingBook } from "./useReadingBook";

function Reader() {
  const source = useRef<HTMLDivElement>(null), mount = useRef<HTMLDivElement>(null);
  const reading = useReadingBook(true, source, mount);
  return <><div ref={source} hidden>{Array.from({ length: 7 }, (_, i) => <article key={i}>{i}</article>)}</div><div ref={mount} /><output>{reading.page}</output><button disabled={!reading.ready} onClick={() => reading.turn(reading.page + 1)}>Next</button></>;
}
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
it("restores the last page on this device and saves the next page in reduced motion", async () => {
  localStorage.setItem("ml-reading-room-page", "2");
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  vi.stubGlobal("IntersectionObserver", class { constructor(private callback: IntersectionObserverCallback) {} observe() { this.callback([{ isIntersecting: true }] as IntersectionObserverEntry[], this as unknown as IntersectionObserver); } disconnect() {} });
  render(<Reader />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Next" })).toBeEnabled());
  expect(screen.getByRole("status")).toHaveTextContent("2");
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(localStorage.getItem("ml-reading-room-page")).toBe("3");
  expect(screen.getByRole("status")).toHaveTextContent("3");
});